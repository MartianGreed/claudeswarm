# @claudeswarm/worker

Job execution worker for Claudeswarm. Processes tickets via agentic loops with Claude Code.

## Quick Start

```bash
# Start the worker
bun run dev

# Worker connects to pg-boss queue and processes jobs
```

## Architecture

```
src/
├── index.ts          # Queue subscriptions, lifecycle
├── env.ts            # Environment configuration
├── ralph-loop.ts     # Core agentic iteration loop
├── executor.ts       # Claude CLI spawning
└── sandbox.ts        # Git clone and branch management
```

## Core Components

### RalphLoop

The main execution orchestrator implementing the agentic loop pattern:

```
1. Setup sandbox (clone repo, create branch)
2. Build prompt from ticket
3. Execute Claude iteration
4. Parse output for signals:
   - <promise>TASK COMPLETE</promise> → Complete
   - <clarification>question</clarification> → Pause for human
   - PR URL detected → PR created
5. Repeat until complete or max iterations
```

### SandboxManager

Manages isolated execution environments:

```typescript
const sandbox = new SandboxManager('/tmp/sandboxes')

// Create sandbox with git clone
const { sandboxPath, branchName } = await sandbox.create(jobPayload)

// Cleanup after completion
await sandbox.cleanup(sandboxPath)
```

### ClaudeExecutor

Spawns Claude Code CLI with streaming output:

```typescript
const executor = new ClaudeExecutor({
  sandboxPath: '/tmp/sandboxes/job-123',
  prompt: 'Implement feature X...',
  timeout: 10 * 60 * 1000,  // 10 minutes
  onOutput: (chunk) => console.log(chunk),
})

const { output, exitCode } = await executor.execute()
```

## Job State Machine

```
pending
   │
   ▼
running ──────────────────┐
   │                      │
   ├──▶ needs_clarification ──(answer)──┐
   │                                    │
   ├──▶ pr_created ──▶ completed        │
   │                                    │
   └──▶ failed                          │
                                        │
   ◀────────────────────────────────────┘
```

## Queue Subscriptions

| Queue | Handler | Description |
|-------|---------|-------------|
| `job:process` | RalphLoop.run() | Execute new job |
| `job:resume` | RalphLoop.resumeWithAnswer() | Resume with clarification |
| `job:cancel` | Abort execution | Cancel running job |

## Claude Communication Protocol

The worker parses Claude output for XML tags:

```xml
<!-- Completion signal -->
<promise>TASK COMPLETE</promise>

<!-- Request clarification -->
<clarification>What authentication method?</clarification>
```

PR URLs are auto-detected from output:
- GitHub: `https://github.com/org/repo/pull/123`
- GitLab: `https://gitlab.com/org/repo/-/merge_requests/123`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Required |
| `WORKER_ID` | Unique worker identifier | `worker-{random}` |
| `SANDBOX_BASE_PATH` | Directory for sandboxes | `/tmp/claudeswarm/sandboxes` |
| `CONCURRENCY` | Max parallel jobs | `3` |

## Job Logging

Every iteration is logged to `job_logs` table:

| Event Type | Description |
|------------|-------------|
| `iteration_start` | Beginning of iteration |
| `iteration_end` | End with output and signals |
| `clarification_requested` | Paused for human input |
| `pr_created` | PR detected in output |
| `completed` | Job finished successfully |
| `max_iterations_reached` | Hit iteration limit |
| `error` | Execution failed |

## Development

```bash
# Install dependencies
bun install

# Start worker
bun run dev

# Type check
bun run type:check

# Build
bun run build
```

## Dependencies

- `@claudeswarm/db` - Database client
- `@claudeswarm/queue` - Job queue
- `@claudeswarm/shared` - Shared utilities
- `@claudeswarm/vcs` - Git operations
- `simple-git` - Git commands
