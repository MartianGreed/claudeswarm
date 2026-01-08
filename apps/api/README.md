# @claudeswarm/api

Backend API server for Claudeswarm using Hono and Connect-RPC (gRPC).

## Quick Start

```bash
# Start the server
bun run dev

# Server runs on http://localhost:3000
```

## Architecture

```
src/
├── index.ts          # Hono app setup, middleware
├── env.ts            # Environment configuration
├── middleware/
│   └── auth.ts       # Session auth middleware
├── routes/
│   └── health.ts     # Health check endpoint
└── services/
    └── auth.ts       # Auth business logic
```

## Endpoints

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

### gRPC (Connect-RPC)

All gRPC services are available at `/grpc/*`:

- `AuthService` - Magic link auth, sessions
- `ProjectService` - CRUD operations
- `JobService` - Job management, logs
- `TicketService` - Ticket sync

## Middleware

1. **Logger** - Request/response logging
2. **CORS** - Cross-origin for dashboard (localhost:5173)
3. **Auth** - Session validation via Bearer token

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Server port | `3000` |
| `API_HOST` | Server host | `localhost` |
| `DATABASE_URL` | PostgreSQL connection string | See below |
| `AUTH_SECRET` | Session signing secret (32+ chars) | Required |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed domains | - |
| `RESEND_API_KEY` | Resend.com API key for emails | - |
| `EMAIL_FROM` | Sender email address | `noreply@claudeswarm.dev` |
| `ENCRYPTION_KEY` | 64-char hex for token encryption | Required |

Default DATABASE_URL:
```
postgresql://claudeswarm:claudeswarm@localhost:5432/claudeswarm
```

## Auth Flow

```
1. User enters email
   └── POST /grpc/claudeswarm.v1.AuthService/SendMagicLink

2. User clicks email link
   └── POST /grpc/claudeswarm.v1.AuthService/VerifyMagicLink
   └── Returns session token

3. Dashboard stores token
   └── Authorization: Bearer <token>

4. Protected requests
   └── Auth middleware validates session
   └── Attaches user to context
```

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Type check
bun run type:check

# Build
bun run build
```

## Dependencies

- `hono` - Web framework
- `@hono/node-server` - Bun server adapter
- `@connectrpc/connect-node` - gRPC server
- `@claudeswarm/db` - Database client
- `@claudeswarm/proto` - Protobuf definitions
- `@claudeswarm/queue` - Job queue
- `@claudeswarm/shared` - Shared utilities
