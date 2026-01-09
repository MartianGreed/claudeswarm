import { type createDbClient, jobs } from '@claudeswarm/db'
import { QUEUE_NAMES, createQueue } from '@claudeswarm/queue'
import { eq } from 'drizzle-orm'
import { env } from './env'

export const queue = createQueue(env.DATABASE_URL)

let started = false

export async function startQueue(): Promise<void> {
  if (!started) {
    await queue.start()

    // pg-boss v10 requires explicit queue creation before send/work
    await queue.createQueue(QUEUE_NAMES.JOB_PROCESS)
    await queue.createQueue(QUEUE_NAMES.JOB_RESUME)
    await queue.createQueue(QUEUE_NAMES.JOB_CANCEL)
    await queue.createQueue(QUEUE_NAMES.JOB_PERMISSION_ANSWER)

    started = true
    console.log('Queue started')
  }
}

export async function stopQueue(): Promise<void> {
  if (started) {
    await queue.stop()
    started = false
    console.log('Queue stopped')
  }
}

export async function recoverOrphanedJobs(db: ReturnType<typeof createDbClient>): Promise<void> {
  const pendingJobs = await db.query.jobs.findMany({
    where: eq(jobs.status, 'pending'),
    with: { ticket: true, project: true },
  })

  if (pendingJobs.length === 0) {
    console.log('No orphaned jobs to recover')
    return
  }

  console.log(`Recovering ${pendingJobs.length} orphaned job(s)...`)

  for (const job of pendingJobs) {
    await queue.send(QUEUE_NAMES.JOB_PROCESS, {
      jobId: job.id,
      projectId: job.projectId,
      ticketId: job.ticketId,
      externalTicketId: job.ticket.externalId,
      repoUrl: job.project.repoUrl,
      defaultBranch: job.project.defaultBranch,
      vcsProvider: job.project.vcsProvider,
      vcsToken: job.project.vcsToken,
      title: job.ticket.title,
      description: job.ticket.description || '',
      maxIterations: 100,
      completionPromise: 'TASK COMPLETE',
      sandboxBasePath: job.project.sandboxBasePath,
      claudeMdTemplate: job.project.claudeMdTemplate,
      claudePermissionsConfig: job.project.claudePermissionsConfig,
      sandboxPath: job.sandboxPath,
      branchName: job.branchName,
      ticketProvider: job.project.ticketProvider,
      ticketProviderToken: job.project.ticketProviderToken,
      ticketProviderConfig: job.project.ticketProviderConfig,
      ticketComments: job.ticket.comments || [],
    })
    console.log(`  Re-queued job ${job.id}`)
  }
}
