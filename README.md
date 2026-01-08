# Claudeswarm

Automated ticket-to-PR orchestrator powered by Claude Code. Syncs tickets from issue trackers, creates sandboxed environments, and iteratively implements tasks using agentic loops.

## Features

- **Multi-provider ticket sync** - Linear, Notion, Jira support via pluggable adapters
- **Sandboxed execution** - Each job runs in isolated git clone with feature branch
- **Agentic loops** - Ralph-wiggum style iterations with completion signals
- **Clarification handling** - Pause jobs for human input, resume seamlessly
- **PR creation** - Automatic pull requests on GitHub/GitLab
- **Real-time monitoring** - Dashboard with job status, logs, and metrics
- **Multi-tenant** - Organization-based access with email domain whitelisting

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│    API Server   │────▶│    PostgreSQL   │
│   (React)       │     │    (Hono+gRPC)  │     │                 │
└─────────────────┘     └────────┬────────┘     └────────▲────────┘
                                 │                       │
                        ┌────────▼────────┐              │
                        │    pg-boss      │──────────────┤
                        │    (Queue)      │              │
                        └────────┬────────┘              │
                                 │                       │
                        ┌────────▼────────┐              │
                        │     Worker      │──────────────┘
                        │  (RalphLoop)    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Claude Code   │
                        │   (Sandbox)     │
                        └─────────────────┘
```

## Job State Machine

```
pending ──▶ running ──▶ pr_created ──▶ completed
               │              ▲
               ▼              │
        needs_clarification ──┘ (after answer)
               │
               ▼
            failed
```

## Quick Start

```bash
# Prerequisites: Bun 1.1+, Docker

# Clone and install
git clone https://github.com/your-org/claudeswarm.git
cd claudeswarm
bun install

# Start PostgreSQL
docker compose up -d

# Run migrations
bun run db:migrate

# Start all services (3 terminals)
bun run dev:api        # API on :3000
bun run dev:dashboard  # Dashboard on :5173
bun run dev:worker     # Job processor
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Database | PostgreSQL + Drizzle ORM |
| Job Queue | pg-boss |
| API | Hono + Connect-RPC (gRPC) |
| Frontend | React + TanStack Router/Query + Tailwind |
| Auth | Magic links + email domain whitelist |
| VCS | jj (Jujutsu) for Claude work |

## Monorepo Structure

```
claudeswarm/
├── apps/
│   ├── api/              # Hono + gRPC server
│   ├── dashboard/        # React monitoring UI
│   └── worker/           # Job processor
├── packages/
│   ├── db/               # Drizzle schema + migrations
│   ├── proto/            # Protobuf definitions
│   ├── queue/            # pg-boss abstraction
│   ├── shared/           # Types, errors, utils
│   ├── ticket-providers/ # Linear/Notion/Jira adapters
│   └── vcs/              # GitHub/GitLab PR creation
├── biome.json
├── docker-compose.yml
└── tsconfig.json
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all apps |
| `bun run dev:api` | Start API server |
| `bun run dev:dashboard` | Start dashboard |
| `bun run dev:worker` | Start worker |
| `bun run build` | Build all packages |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run type:check` | TypeScript check |
| `bun run test` | Run all tests |
| `bun run db:generate` | Generate migrations |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run proto:generate` | Generate from .proto |

## Environment Variables

### API Server

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Server port | `3000` |
| `API_HOST` | Server host | `localhost` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://claudeswarm:claudeswarm@localhost:5432/claudeswarm` |
| `AUTH_SECRET` | Session signing (32+ chars) | - |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated domains | - |
| `RESEND_API_KEY` | Email service API key | - |
| `EMAIL_FROM` | Sender email address | `noreply@claudeswarm.dev` |
| `ENCRYPTION_KEY` | 64-char hex key | - |

### Worker

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | - |
| `WORKER_ID` | Unique worker identifier | - |
| `SANDBOX_BASE_PATH` | Job sandbox directory | `/tmp/claudeswarm/sandboxes` |
| `CONCURRENCY` | Max parallel jobs | `3` |

## Claude Communication Protocol

The worker communicates with Claude using XML tags:

```xml
<!-- Task completion signal -->
<promise>TASK COMPLETE</promise>

<!-- Request human clarification -->
<clarification>What authentication method should I use?</clarification>
```

Worker parses Claude output for these tags to determine next action.

## License

MIT
