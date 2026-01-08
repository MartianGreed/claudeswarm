import { create } from '@bufbuild/protobuf'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'
import { createDbClient, jobLogs, jobs, tickets } from '@claudeswarm/db'
import {
  AnswerClarificationResponseSchema,
  CancelJobResponseSchema,
  GetJobLogsResponseSchema,
  GetJobResponseSchema,
  JobLogSchema,
  JobSchema,
  JobService,
  JobStatus,
  ListJobsResponseSchema,
  RetryJobResponseSchema,
  TicketSchema,
} from '@claudeswarm/proto'
import { createQueue, QUEUE_NAMES } from '@claudeswarm/queue'
import type { ConnectRouter } from '@connectrpc/connect'
import { and, count, desc, eq } from 'drizzle-orm'
import { env } from '../env'
import type { AuthUser } from '../middleware/auth'

const db = createDbClient(env.DATABASE_URL)
const queue = createQueue(env.DATABASE_URL)

function getUser(ctx: { requestHeader: Headers }): AuthUser {
  const userHeader = ctx.requestHeader.get('x-user-json')
  if (!userHeader) {
    throw new Error('Not authenticated')
  }
  return JSON.parse(userHeader) as AuthUser
}

function mapStatusToProto(status: string): JobStatus {
  switch (status) {
    case 'pending':
      return JobStatus.PENDING
    case 'waiting_dependency':
      return JobStatus.WAITING_DEPENDENCY
    case 'running':
      return JobStatus.RUNNING
    case 'needs_clarification':
      return JobStatus.NEEDS_CLARIFICATION
    case 'pr_created':
      return JobStatus.PR_CREATED
    case 'completed':
      return JobStatus.COMPLETED
    case 'failed':
      return JobStatus.FAILED
    case 'cancelled':
      return JobStatus.CANCELLED
    default:
      return JobStatus.UNSPECIFIED
  }
}

function mapStatusFromProto(status: JobStatus): string | undefined {
  switch (status) {
    case JobStatus.PENDING:
      return 'pending'
    case JobStatus.WAITING_DEPENDENCY:
      return 'waiting_dependency'
    case JobStatus.RUNNING:
      return 'running'
    case JobStatus.NEEDS_CLARIFICATION:
      return 'needs_clarification'
    case JobStatus.PR_CREATED:
      return 'pr_created'
    case JobStatus.COMPLETED:
      return 'completed'
    case JobStatus.FAILED:
      return 'failed'
    case JobStatus.CANCELLED:
      return 'cancelled'
    default:
      return undefined
  }
}

export default (router: ConnectRouter) =>
  router.service(JobService, {
    async listJobs(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        return create(ListJobsResponseSchema, { jobs: [], total: 0 })
      }

      const limit = req.limit || 50
      const offset = req.offset || 0

      const whereConditions = [eq(jobs.projectId, req.projectId)]
      if (req.status !== undefined && req.status !== JobStatus.UNSPECIFIED) {
        const statusStr = mapStatusFromProto(req.status)
        if (statusStr) {
          whereConditions.push(eq(jobs.status, statusStr as typeof jobs.status.enumValues[number]))
        }
      }

      const results = await db.query.jobs.findMany({
        where: and(...whereConditions),
        with: { ticket: true },
        limit,
        offset,
        orderBy: [desc(jobs.updatedAt)],
      })

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(jobs)
        .where(and(...whereConditions))

      return create(ListJobsResponseSchema, {
        jobs: results.map((j) =>
          create(JobSchema, {
            id: j.id,
            projectId: j.projectId,
            ticketId: j.ticketId,
            status: mapStatusToProto(j.status),
            iteration: j.iteration,
            maxIterations: j.maxIterations,
            sandboxPath: j.sandboxPath || undefined,
            branchName: j.branchName || undefined,
            prUrl: j.prUrl || undefined,
            prNumber: j.prNumber || undefined,
            blockedByJobId: j.blockedByJobId || undefined,
            errorMessage: j.errorMessage || undefined,
            workerId: j.workerId || undefined,
            clarificationQuestion: j.clarificationQuestion || undefined,
            clarificationAnswer: j.clarificationAnswer || undefined,
            startedAt: j.startedAt ? timestampFromDate(j.startedAt) : undefined,
            completedAt: j.completedAt ? timestampFromDate(j.completedAt) : undefined,
            createdAt: timestampFromDate(j.createdAt),
            updatedAt: timestampFromDate(j.updatedAt),
          }),
        ),
        total,
      })
    },

    async getJob(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, req.jobId),
        with: { ticket: true },
      })

      if (!job) {
        throw new Error('Job not found')
      }

      return create(GetJobResponseSchema, {
        job: create(JobSchema, {
          id: job.id,
          projectId: job.projectId,
          ticketId: job.ticketId,
          status: mapStatusToProto(job.status),
          iteration: job.iteration,
          maxIterations: job.maxIterations,
          sandboxPath: job.sandboxPath || undefined,
          branchName: job.branchName || undefined,
          prUrl: job.prUrl || undefined,
          prNumber: job.prNumber || undefined,
          blockedByJobId: job.blockedByJobId || undefined,
          errorMessage: job.errorMessage || undefined,
          workerId: job.workerId || undefined,
          clarificationQuestion: job.clarificationQuestion || undefined,
          clarificationAnswer: job.clarificationAnswer || undefined,
          startedAt: job.startedAt ? timestampFromDate(job.startedAt) : undefined,
          completedAt: job.completedAt ? timestampFromDate(job.completedAt) : undefined,
          createdAt: timestampFromDate(job.createdAt),
          updatedAt: timestampFromDate(job.updatedAt),
        }),
        ticket: create(TicketSchema, {
          id: job.ticket.id,
          projectId: job.ticket.projectId,
          externalId: job.ticket.externalId,
          externalUrl: job.ticket.externalUrl,
          title: job.ticket.title,
          description: job.ticket.description || undefined,
          priority: job.ticket.priority || undefined,
          labels: job.ticket.labels || [],
          dependsOn: job.ticket.dependsOn || [],
          lastSyncedAt: timestampFromDate(job.ticket.lastSyncedAt),
          createdAt: timestampFromDate(job.ticket.createdAt),
        }),
      })
    },

    async cancelJob(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, req.jobId),
      })

      if (!job) {
        throw new Error('Job not found')
      }

      if (job.status !== 'running' && job.status !== 'pending') {
        throw new Error('Job cannot be cancelled')
      }

      await queue.start()
      await queue.send(QUEUE_NAMES.JOB_CANCEL, { jobId: req.jobId })
      await queue.stop()

      await db
        .update(jobs)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(jobs.id, req.jobId))

      return create(CancelJobResponseSchema, { success: true })
    },

    async retryJob(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, req.jobId),
      })

      if (!job) {
        throw new Error('Job not found')
      }

      if (job.status !== 'failed' && job.status !== 'cancelled') {
        throw new Error('Only failed or cancelled jobs can be retried')
      }

      await db
        .update(jobs)
        .set({
          status: 'pending',
          iteration: 0,
          errorMessage: null,
          errorStack: null,
          workerId: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, req.jobId))

      return create(RetryJobResponseSchema, { success: true })
    },

    async answerClarification(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, req.jobId),
      })

      if (!job) {
        throw new Error('Job not found')
      }

      if (job.status !== 'needs_clarification') {
        throw new Error('Job is not awaiting clarification')
      }

      await db
        .update(jobs)
        .set({
          clarificationAnswer: req.answer,
          status: 'running',
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, req.jobId))

      await queue.start()
      await queue.send(QUEUE_NAMES.JOB_RESUME, { jobId: req.jobId, answer: req.answer })
      await queue.stop()

      return create(AnswerClarificationResponseSchema, { success: true })
    },

    async getJobLogs(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const limit = req.limit || 100
      const offset = req.offset || 0

      const logs = await db.query.jobLogs.findMany({
        where: eq(jobLogs.jobId, req.jobId),
        limit,
        offset,
        orderBy: [desc(jobLogs.createdAt)],
      })

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(jobLogs)
        .where(eq(jobLogs.jobId, req.jobId))

      return create(GetJobLogsResponseSchema, {
        logs: logs.map((l) =>
          create(JobLogSchema, {
            id: l.id,
            jobId: l.jobId,
            iteration: l.iteration,
            eventType: l.eventType,
            eventDataJson: l.eventData ? JSON.stringify(l.eventData) : undefined,
            claudeOutput: l.claudeOutput || undefined,
            createdAt: timestampFromDate(l.createdAt),
          }),
        ),
        total,
      })
    },

    async *streamJobUpdates(_req, _ctx) {
      throw new Error('StreamJobUpdates not yet implemented')
    },
  })
