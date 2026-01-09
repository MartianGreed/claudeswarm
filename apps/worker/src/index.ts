import { createDbClient, jobs } from '@claudeswarm/db'
import {
  type JobPermissionAnswerPayload,
  type JobProcessPayload,
  type JobResumePayload,
  QUEUE_NAMES,
  createQueue,
} from '@claudeswarm/queue'
import { eq } from 'drizzle-orm'
import { env } from './env'
import { RalphLoop } from './ralph-loop'

const queue = createQueue(env.DATABASE_URL)
const db = createDbClient(env.DATABASE_URL)

// Track running jobs for cancellation
const runningJobs = new Map<string, RalphLoop>()

async function main() {
  console.log(`Starting worker ${env.WORKER_ID}`)
  console.log(`Sandbox base path: ${env.SANDBOX_BASE_PATH}`)
  console.log(`Concurrency: ${env.CONCURRENCY}`)

  await queue.start()

  // pg-boss v10 requires explicit queue creation before work
  await queue.createQueue(QUEUE_NAMES.JOB_PROCESS)
  await queue.createQueue(QUEUE_NAMES.JOB_RESUME)
  await queue.createQueue(QUEUE_NAMES.JOB_CANCEL)
  await queue.createQueue(QUEUE_NAMES.JOB_PERMISSION_ANSWER)

  // Subscribe to job processing
  await queue.subscribe(QUEUE_NAMES.JOB_PROCESS, async (job) => {
    const payload = job.data as JobProcessPayload
    console.log(`Processing job ${payload.jobId}: ${payload.title}`)

    const loop = new RalphLoop(payload)
    runningJobs.set(payload.jobId, loop)

    try {
      await loop.run()
    } finally {
      runningJobs.delete(payload.jobId)
    }
  })

  // Subscribe to job resume (after clarification answered)
  await queue.subscribe(QUEUE_NAMES.JOB_RESUME, async (job) => {
    const payload = job.data as JobResumePayload
    console.log(`Resuming job ${payload.jobId} with answer`)

    let loop = runningJobs.get(payload.jobId)

    if (!loop) {
      // Reconstruct RalphLoop from database
      const jobData = await db.query.jobs.findFirst({
        where: eq(jobs.id, payload.jobId),
        with: { project: true, ticket: true },
      })

      if (!jobData || !jobData.project || !jobData.ticket) {
        console.error(`Job ${payload.jobId} not found in database`)
        return
      }

      const jobPayload: JobProcessPayload = {
        jobId: jobData.id,
        projectId: jobData.projectId,
        ticketId: jobData.ticketId,
        externalTicketId: jobData.ticket.externalId,
        repoUrl: jobData.project.repoUrl,
        defaultBranch: jobData.project.defaultBranch,
        vcsProvider: jobData.project.vcsProvider,
        vcsToken: jobData.project.vcsToken,
        title: jobData.ticket.title,
        description: jobData.ticket.description || '',
        maxIterations: 100,
        completionPromise: 'TASK COMPLETE',
        sandboxBasePath: jobData.project.sandboxBasePath,
        claudeMdTemplate: jobData.project.claudeMdTemplate,
        claudePermissionsConfig: jobData.project.claudePermissionsConfig,
        sandboxPath: jobData.sandboxPath,
        branchName: jobData.branchName,
        ticketProvider: jobData.project.ticketProvider,
        ticketProviderToken: jobData.project.ticketProviderToken,
        ticketProviderConfig: jobData.project.ticketProviderConfig,
        ticketComments: jobData.ticket.comments || [],
      }

      loop = new RalphLoop(jobPayload)
      runningJobs.set(payload.jobId, loop)
    }

    try {
      await loop.resumeWithAnswer(payload.answer)
    } finally {
      runningJobs.delete(payload.jobId)
    }
  })

  // Subscribe to job cancellation
  await queue.subscribe(QUEUE_NAMES.JOB_CANCEL, async (job) => {
    const payload = job.data as { jobId: string }
    console.log(`Cancelling job ${payload.jobId}`)

    // TODO: Implement cancellation
    // Would need to signal the running loop to stop
  })

  // Subscribe to permission answer
  await queue.subscribe(QUEUE_NAMES.JOB_PERMISSION_ANSWER, async (job) => {
    const payload = job.data as JobPermissionAnswerPayload
    console.log(`Permission ${payload.approved ? 'approved' : 'denied'} for job ${payload.jobId}`)

    const existingLoop = runningJobs.get(payload.jobId)
    if (existingLoop) {
      await existingLoop.resumeWithPermission(payload.approved, payload.command)
    } else {
      console.error(`Job ${payload.jobId} not found in running jobs`)
    }
  })

  console.log('Worker ready and listening for jobs')

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...')
    await queue.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Shutting down worker...')
    await queue.stop()
    process.exit(0)
  })
}

main().catch(console.error)
