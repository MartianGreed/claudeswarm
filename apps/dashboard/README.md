# @claudeswarm/dashboard

React dashboard for monitoring Claudeswarm jobs and managing projects.

## Quick Start

```bash
# Start development server
bun run dev

# Dashboard runs on http://localhost:5173
```

## Architecture

```
src/
├── main.tsx         # Vite entry point
├── App.tsx          # Root component with navigation
└── index.css        # Global Tailwind styles
```

## Features

- **Projects View** - List and manage projects
- **Jobs View** - Monitor job status and progress
- **Clarification UI** - Answer Claude questions
- **Real-time Updates** - Live job status via gRPC streaming

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Build | Vite 6 |
| Routing | TanStack Router |
| State | TanStack Query |
| Styling | Tailwind CSS |
| API Client | Connect-Web (gRPC) |

## API Client Setup

```typescript
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { JobService } from '@claudeswarm/proto'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:3000',
})

const client = createClient(JobService, transport)

// List jobs
const { jobs } = await client.listJobs({ projectId: 'proj-123' })

// Stream updates
for await (const update of client.streamJobUpdates({ jobId: 'job-456' })) {
  console.log(update.status)
}
```

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | ProjectsView | List all projects |
| `/projects/:id` | ProjectDetail | Project jobs and stats |
| `/jobs/:id` | JobDetail | Job logs and clarification |
| `/login` | Login | Magic link authentication |

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check
bun run type:check

# Build for production
bun run build

# Preview production build
bun run preview
```

## Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:3000
```

## Dependencies

- `react` - UI framework
- `@tanstack/react-router` - Type-safe routing
- `@tanstack/react-query` - Server state management
- `@connectrpc/connect-web` - gRPC browser client
- `tailwindcss` - Utility-first CSS
- `vite` - Build tool
