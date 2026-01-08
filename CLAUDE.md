# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClaudeSwarm is a Claude Code orchestrator that automatically processes tickets from issue trackers (Linear/Notion/Jira), creates sandboxed development environments, and iteratively works on tasks using ralph-wiggum-style loops until completion.

## Development Commands

```bash
# Install dependencies
bun install

# Start development servers
bun run dev           # All apps
bun run dev:api       # API server only (port 3000)
bun run dev:dashboard # Dashboard only (port 5173)
bun run dev:worker    # Worker only

# Code quality
bun run lint          # Check with Biome
bun run lint:fix      # Fix with Biome
bun run format        # Format with Biome
bun run type:check    # TypeScript check

# Testing
bun test              # Run all tests

# Database
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Apply migrations
bun run db:studio     # Open Drizzle Studio

# Proto generation
bun run proto:generate  # Generate gRPC types from proto
```

## Architecture

### Monorepo Structure

```
claudeswarm/
├── apps/
│   ├── api/              # Hono + Connect-ES gRPC server
│   ├── dashboard/        # React monitoring UI
│   └── worker/           # Job processor, spawns Claude
├── packages/
│   ├── db/               # Drizzle ORM + PostgreSQL schema
│   ├── proto/            # Protobuf definitions + generated code
│   ├── queue/            # pg-boss job queue wrapper
│   ├── shared/           # Shared types, utils, errors
│   ├── ticket-providers/ # Linear/Notion/Jira adapters
│   └── vcs/              # GitHub/GitLab PR creation
```

### Key Components

- **Worker (apps/worker)**: Picks up jobs from queue, creates sandboxes, runs Claude in ralph-wiggum loops
- **RalphLoop (apps/worker/src/ralph-loop.ts)**: Core iteration logic with completion/clarification detection
- **SandboxManager (apps/worker/src/sandbox.ts)**: Creates isolated git clones per job
- **ClaudeExecutor (apps/worker/src/executor.ts)**: Spawns Claude CLI, streams output

### Job States

`pending` → `running` → `pr_created` → `completed`
- Can transition to `needs_clarification` (awaiting human input)
- Can transition to `failed` (error or max iterations)
- Can be `cancelled`

### Claude Communication Protocol

Claude signals completion via `<promise>TASK COMPLETE</promise>` tags.
Claude requests clarification via `<clarification>question</clarification>` tags.

## Local Development

```bash
# Start PostgreSQL
docker compose up -d

# Run migrations
bun run db:migrate

# Start all services
bun run dev
```

## Tech Stack

- **Runtime**: Bun
- **Database**: PostgreSQL + Drizzle ORM
- **Job Queue**: pg-boss
- **API**: Hono + Connect-ES (gRPC)
- **Frontend**: React + TanStack Query + Tailwind
- **VCS during work**: jj (Jujutsu)
