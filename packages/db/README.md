# @claudeswarm/db

Database schema and client for Claudeswarm using Drizzle ORM with PostgreSQL.

## Installation

```bash
bun add @claudeswarm/db
```

## Usage

```typescript
import { createClient, users, projects, jobs } from '@claudeswarm/db'

const db = createClient(process.env.DATABASE_URL)

// Query users
const allUsers = await db.select().from(users)

// Insert a project
await db.insert(projects).values({
  organizationId: orgId,
  name: 'My Project',
  slug: 'my-project',
  repoUrl: 'https://github.com/org/repo',
  vcsProvider: 'github',
  vcsToken: token,
  ticketProvider: 'linear',
  ticketProviderConfig: { teamId: 'team-123' },
  ticketProviderToken: linearToken,
})
```

## Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with email and profile |
| `organizations` | Multi-tenant org grouping |
| `organizationMembers` | User membership in orgs |
| `projects` | VCS repos + ticket system configs |
| `tickets` | External tickets synced from providers |
| `jobs` | Execution jobs linked to tickets |
| `jobLogs` | Detailed event logs per job iteration |
| `sessions` | User authentication sessions |

### Enums

```typescript
// Job status progression
type JobStatus =
  | 'pending'
  | 'waiting_dependency'
  | 'running'
  | 'needs_clarification'
  | 'pr_created'
  | 'completed'
  | 'failed'
  | 'cancelled'

// Supported ticket providers
type TicketProvider = 'linear' | 'notion' | 'jira'

// Supported VCS providers
type VcsProvider = 'github' | 'gitlab'
```

### Entity Relationships

```
Organization
    └── Projects
         ├── Tickets
         │    └── Jobs
         │         └── JobLogs
         └── Jobs

User
    ├── OrganizationMembers
    └── Sessions
```

## Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Open Drizzle Studio UI
bun run db:studio
```

## Exported Types

```typescript
import type {
  User, NewUser,
  Organization, NewOrganization,
  Project, NewProject,
  Ticket, NewTicket,
  Job, NewJob,
  JobLog, NewJobLog,
  Session, NewSession,
  JobStatus,
  TicketProvider,
  VcsProvider,
} from '@claudeswarm/db'
```

## Dependencies

- `drizzle-orm` - Type-safe ORM
- `postgres` - PostgreSQL driver
- `drizzle-kit` - Migration tooling (dev)
