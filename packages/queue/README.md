# @claudeswarm/queue

PostgreSQL-backed job queue for Claudeswarm using pg-boss.

## Installation

```bash
bun add @claudeswarm/queue
```

## Usage

### Creating a Queue

```typescript
import { createQueue } from '@claudeswarm/queue'

const queue = createQueue(process.env.DATABASE_URL)
await queue.start()

// Graceful shutdown
process.on('SIGTERM', async () => {
  await queue.stop()
})
```

### Sending Jobs

```typescript
import { QUEUE_NAMES } from '@claudeswarm/queue'

// Process a job
await queue.send(QUEUE_NAMES.JOB_PROCESS, {
  jobId: 'job-123',
  projectId: 'proj-456',
  ticketId: 'ticket-789',
  externalTicketId: 'LINEAR-123',
  repoUrl: 'https://github.com/org/repo',
  defaultBranch: 'main',
  vcsProvider: 'github',
  vcsToken: token,
  title: 'Add dark mode',
  description: 'Implement dark mode toggle...',
  maxIterations: 100,
  completionPromise: 'TASK COMPLETE',
  sandboxBasePath: '/tmp/sandboxes',
  claudeMdTemplate: null,
})

// Send with delay
await queue.sendAfter(QUEUE_NAMES.TICKET_SYNC, { projectId: 'proj-456' }, 60)
```

### Subscribing to Jobs

```typescript
import { QUEUE_NAMES, type JobProcessPayload } from '@claudeswarm/queue'

await queue.subscribe(QUEUE_NAMES.JOB_PROCESS, async (job) => {
  const payload: JobProcessPayload = job.data
  console.log(`Processing job ${payload.jobId}`)

  // Do work...
})
```

### Managing Jobs

```typescript
// Cancel a job
await queue.cancel(QUEUE_NAMES.JOB_PROCESS, jobId)

// Get job by ID
const job = await queue.getJob(QUEUE_NAMES.JOB_PROCESS, jobId)
```

## Queue Names

| Queue | Payload | Description |
|-------|---------|-------------|
| `job:process` | `JobProcessPayload` | Main job execution |
| `job:resume` | `JobResumePayload` | Resume after clarification |
| `job:cancel` | `JobCancelPayload` | Job cancellation request |
| `ticket:sync` | `TicketSyncPayload` | Sync tickets from provider |

## Payload Types

```typescript
interface JobProcessPayload {
  jobId: string
  projectId: string
  ticketId: string
  externalTicketId: string
  repoUrl: string
  defaultBranch: string
  vcsProvider: 'github' | 'gitlab'
  vcsToken: string
  title: string
  description: string
  maxIterations: number
  completionPromise: string | null
  sandboxBasePath: string
  claudeMdTemplate: string | null
}

interface JobResumePayload {
  jobId: string
  answer: string
}

interface JobCancelPayload {
  jobId: string
}

interface TicketSyncPayload {
  projectId: string
}
```

## API Reference

### Queue Class

| Method | Description |
|--------|-------------|
| `start()` | Initialize queue and connect to database |
| `stop()` | Gracefully shutdown |
| `send(name, data)` | Enqueue a job |
| `sendAfter(name, data, delaySec)` | Enqueue with delay |
| `subscribe(name, handler)` | Subscribe to queue |
| `cancel(name, jobId)` | Cancel a job |
| `getJob(name, jobId)` | Get job by ID |
| `instance` | Access underlying pg-boss instance |

## Dependencies

- `pg-boss` - PostgreSQL job queue
- `@claudeswarm/shared` - Shared types
