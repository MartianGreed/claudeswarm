# @claudeswarm/proto

Protocol Buffer definitions and generated TypeScript code for Claudeswarm gRPC services.

## Installation

```bash
bun add @claudeswarm/proto
```

## Code Generation

```bash
# Generate TypeScript from .proto files
bun run proto:generate
```

## Services

### AuthService

```protobuf
service AuthService {
  rpc SendMagicLink(SendMagicLinkRequest) returns (SendMagicLinkResponse);
  rpc VerifyMagicLink(VerifyMagicLinkRequest) returns (VerifyMagicLinkResponse);
  rpc GetCurrentUser(GetCurrentUserRequest) returns (GetCurrentUserResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
}
```

### ProjectService

```protobuf
service ProjectService {
  rpc ListProjects(ListProjectsRequest) returns (ListProjectsResponse);
  rpc GetProject(GetProjectRequest) returns (GetProjectResponse);
  rpc CreateProject(CreateProjectRequest) returns (CreateProjectResponse);
  rpc UpdateProject(UpdateProjectRequest) returns (UpdateProjectResponse);
  rpc DeleteProject(DeleteProjectRequest) returns (DeleteProjectResponse);
  rpc GetProjectStats(GetProjectStatsRequest) returns (GetProjectStatsResponse);
}
```

### JobService

```protobuf
service JobService {
  rpc ListJobs(ListJobsRequest) returns (ListJobsResponse);
  rpc GetJob(GetJobRequest) returns (GetJobResponse);
  rpc CancelJob(CancelJobRequest) returns (CancelJobResponse);
  rpc RetryJob(RetryJobRequest) returns (RetryJobResponse);
  rpc AnswerClarification(AnswerClarificationRequest) returns (AnswerClarificationResponse);
  rpc GetJobLogs(GetJobLogsRequest) returns (GetJobLogsResponse);
  rpc StreamJobUpdates(StreamJobUpdatesRequest) returns (stream StreamJobUpdatesResponse);
}
```

### TicketService

```protobuf
service TicketService {
  rpc SyncTickets(SyncTicketsRequest) returns (SyncTicketsResponse);
  rpc ListTickets(ListTicketsRequest) returns (ListTicketsResponse);
  rpc GetTicket(GetTicketRequest) returns (GetTicketResponse);
}
```

## Usage (Server)

```typescript
import { ConnectRouter } from '@connectrpc/connect'
import { AuthService } from '@claudeswarm/proto'

export default (router: ConnectRouter) =>
  router.service(AuthService, {
    async sendMagicLink(req) {
      // Implementation
      return { success: true }
    },
    async verifyMagicLink(req) {
      // Implementation
      return { sessionToken: '...', user: { ... } }
    },
  })
```

## Usage (Client)

```typescript
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService } from '@claudeswarm/proto'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:3000',
})

const client = createClient(AuthService, transport)

const { success } = await client.sendMagicLink({ email: 'user@example.com' })
```

## Message Types

### Enums

```typescript
enum JobStatus {
  JOB_STATUS_UNSPECIFIED = 0,
  JOB_STATUS_PENDING = 1,
  JOB_STATUS_WAITING_DEPENDENCY = 2,
  JOB_STATUS_RUNNING = 3,
  JOB_STATUS_NEEDS_CLARIFICATION = 4,
  JOB_STATUS_PR_CREATED = 5,
  JOB_STATUS_COMPLETED = 6,
  JOB_STATUS_FAILED = 7,
  JOB_STATUS_CANCELLED = 8,
}

enum TicketProvider {
  TICKET_PROVIDER_UNSPECIFIED = 0,
  TICKET_PROVIDER_LINEAR = 1,
  TICKET_PROVIDER_NOTION = 2,
  TICKET_PROVIDER_JIRA = 3,
}

enum VcsProvider {
  VCS_PROVIDER_UNSPECIFIED = 0,
  VCS_PROVIDER_GITHUB = 1,
  VCS_PROVIDER_GITLAB = 2,
}
```

## Dependencies

- `@bufbuild/protobuf` - Protobuf runtime
- `@connectrpc/connect` - Connect-RPC framework
- `@bufbuild/buf` - Code generation (dev)
- `@bufbuild/protoc-gen-es` - TypeScript generator (dev)
