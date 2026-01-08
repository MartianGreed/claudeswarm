import { create } from '@bufbuild/protobuf'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'
import { createDbClient, jobs, projects, tickets } from '@claudeswarm/db'
import {
  GetTicketResponseSchema,
  ListTicketsResponseSchema,
  SyncTicketsResponseSchema,
  TicketSchema,
  TicketService,
} from '@claudeswarm/proto'
import { QUEUE_NAMES, createQueue } from '@claudeswarm/queue'
import { createTicketProvider } from '@claudeswarm/ticket-providers'
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

export default (router: ConnectRouter) =>
  router.service(TicketService, {
    async syncTickets(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, req.projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      })

      if (!project) {
        throw new Error('Project not found')
      }

      const provider = createTicketProvider(project.ticketProvider)
      const config = {
        token: project.ticketProviderToken,
        ...(project.ticketProviderConfig as Record<string, unknown>),
      }

      const readyTickets = await provider.fetchReadyTickets(config)

      let syncedCount = 0
      let createdJobsCount = 0

      for (const ticketData of readyTickets) {
        const existingTicket = await db.query.tickets.findFirst({
          where: and(
            eq(tickets.projectId, project.id),
            eq(tickets.externalId, ticketData.externalId),
          ),
        })

        let ticketId: string

        if (existingTicket) {
          await db
            .update(tickets)
            .set({
              title: ticketData.title,
              description: ticketData.description,
              priority: ticketData.priority,
              labels: ticketData.labels,
              dependsOn: ticketData.dependsOn,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tickets.id, existingTicket.id))
          ticketId = existingTicket.id
        } else {
          const [newTicket] = await db
            .insert(tickets)
            .values({
              projectId: project.id,
              externalId: ticketData.externalId,
              externalUrl: ticketData.externalUrl,
              title: ticketData.title,
              description: ticketData.description,
              priority: ticketData.priority,
              labels: ticketData.labels,
              dependsOn: ticketData.dependsOn,
              lastSyncedAt: new Date(),
            })
            .returning()
          ticketId = newTicket.id
        }

        syncedCount++

        const existingJob = await db.query.jobs.findFirst({
          where: eq(jobs.ticketId, ticketId),
        })

        if (!existingJob) {
          const [newJob] = await db
            .insert(jobs)
            .values({
              projectId: project.id,
              ticketId: ticketId,
              status: 'pending',
            })
            .returning()

          await queue.start()
          await queue.send(QUEUE_NAMES.JOB_PROCESS, {
            jobId: newJob.id,
            projectId: project.id,
            ticketId: ticketId,
            externalTicketId: ticketData.externalId,
            repoUrl: project.repoUrl,
            defaultBranch: project.defaultBranch,
            vcsProvider: project.vcsProvider,
            vcsToken: project.vcsToken,
            title: ticketData.title,
            description: ticketData.description || '',
            maxIterations: 100,
            completionPromise: 'TASK COMPLETE',
            sandboxBasePath: project.sandboxBasePath,
            claudeMdTemplate: project.claudeMdTemplate,
          })
          await queue.stop()

          createdJobsCount++
        }
      }

      return create(SyncTicketsResponseSchema, {
        syncedCount,
        createdJobsCount,
      })
    },

    async listTickets(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        return create(ListTicketsResponseSchema, { tickets: [], total: 0 })
      }

      const limit = req.limit || 50
      const offset = req.offset || 0

      const results = await db.query.tickets.findMany({
        where: eq(tickets.projectId, req.projectId),
        limit,
        offset,
        orderBy: [desc(tickets.createdAt)],
      })

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.projectId, req.projectId))

      return create(ListTicketsResponseSchema, {
        tickets: results.map((t) =>
          create(TicketSchema, {
            id: t.id,
            projectId: t.projectId,
            externalId: t.externalId,
            externalUrl: t.externalUrl,
            title: t.title,
            description: t.description || undefined,
            priority: t.priority || undefined,
            labels: t.labels || [],
            dependsOn: t.dependsOn || [],
            lastSyncedAt: timestampFromDate(t.lastSyncedAt),
            createdAt: timestampFromDate(t.createdAt),
          }),
        ),
        total,
      })
    },

    async getTicket(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, req.ticketId),
      })

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      return create(GetTicketResponseSchema, {
        ticket: create(TicketSchema, {
          id: ticket.id,
          projectId: ticket.projectId,
          externalId: ticket.externalId,
          externalUrl: ticket.externalUrl,
          title: ticket.title,
          description: ticket.description || undefined,
          priority: ticket.priority || undefined,
          labels: ticket.labels || [],
          dependsOn: ticket.dependsOn || [],
          lastSyncedAt: timestampFromDate(ticket.lastSyncedAt),
          createdAt: timestampFromDate(ticket.createdAt),
        }),
      })
    },
  })
