# @claudeswarm/shared

Shared types, error classes, and utilities for Claudeswarm packages.

## Installation

```bash
bun add @claudeswarm/shared
```

## Types

### Ticket Types

```typescript
import type { TicketData, TicketPriority, ProviderConfig } from '@claudeswarm/shared'

type TicketPriority = 'urgent' | 'high' | 'medium' | 'low'

interface TicketData {
  externalId: string
  externalUrl: string
  title: string
  description: string | null
  priority: TicketPriority | null
  labels: string[]
  dependsOn: string[]
  status: string
  rawData: unknown
}

interface ProviderConfig {
  token: string
  projectId?: string
  workspaceId?: string
  teamId?: string
  [key: string]: unknown
}
```

### PR Types

```typescript
import type { CreatePRParams, PRResult } from '@claudeswarm/shared'

interface CreatePRParams {
  repoUrl: string
  token: string
  title: string
  body: string
  sourceBranch: string
  targetBranch: string
}

interface PRResult {
  url: string
  number: number
}
```

### Job Types

```typescript
import type { JobPayload, JobView, ClaudeLoopState, ClaudeSignals } from '@claudeswarm/shared'

interface JobPayload {
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

interface ClaudeSignals {
  hasCompletionPromise: boolean
  needsClarification: boolean
  clarificationQuestion: string | null
  prCreated: boolean
  prUrl: string | null
}
```

## Error Classes

```typescript
import {
  ClaudeSwarmError,
  TicketProviderError,
  VcsError,
  SandboxError,
  ClaudeExecutorError,
  AuthError,
} from '@claudeswarm/shared'

// Base error with code
throw new ClaudeSwarmError('Something failed', 'CUSTOM_CODE')

// Provider-specific errors
throw new TicketProviderError('Linear API failed', 'linear')
throw new VcsError('Push rejected', 'github')

// Domain errors
throw new SandboxError('Failed to clone repository')
throw new ClaudeExecutorError('Claude process timed out')
throw new AuthError('Invalid session token')
```

## Utilities

### String Utilities

```typescript
import { slugify, truncate, generateId } from '@claudeswarm/shared'

slugify('Hello World!')  // 'hello-world'
truncate('Long text...', 10)  // 'Long te...'
generateId()  // 'aBc123XyZ...' (21 chars)
generateId(32)  // Custom length
```

### Claude Output Parsing

```typescript
import {
  parsePromiseTags,
  parseClarificationTags,
  extractPRUrl,
  extractPRNumber,
} from '@claudeswarm/shared'

const output = `Done! <promise>TASK COMPLETE</promise>`
parsePromiseTags(output)  // 'TASK COMPLETE'

const question = `<clarification>Which auth?</clarification>`
parseClarificationTags(question)  // 'Which auth?'

extractPRUrl('Created https://github.com/org/repo/pull/42')  // URL
extractPRNumber('https://github.com/org/repo/pull/42')  // 42
```

### Async Utilities

```typescript
import { wait, retry } from '@claudeswarm/shared'

// Delay execution
await wait(1000)  // 1 second

// Retry with exponential backoff
const result = await retry(
  async () => fetchData(),
  { maxAttempts: 3, delayMs: 1000, backoff: true }
)
```

## Dependencies

None - pure TypeScript utilities.
