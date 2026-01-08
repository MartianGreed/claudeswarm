# @claudeswarm/ticket-providers

Issue tracker integrations for Claudeswarm. Supports Linear, Notion, and Jira.

## Installation

```bash
bun add @claudeswarm/ticket-providers
```

## Usage

### Creating a Provider

```typescript
import { createTicketProvider } from '@claudeswarm/ticket-providers'

const linear = createTicketProvider('linear')
const notion = createTicketProvider('notion')
const jira = createTicketProvider('jira')
```

### Fetching Ready Tickets

```typescript
const tickets = await linear.fetchReadyTickets({
  token: process.env.LINEAR_API_KEY,
  teamId: 'team-123',
})

for (const ticket of tickets) {
  console.log(ticket.externalId)  // 'ENG-123'
  console.log(ticket.title)       // 'Add dark mode'
  console.log(ticket.priority)    // 'high'
  console.log(ticket.dependsOn)   // ['ENG-100', 'ENG-101']
}
```

### Getting a Single Ticket

```typescript
const ticket = await linear.getTicket('ENG-123', {
  token: process.env.LINEAR_API_KEY,
  teamId: 'team-123',
})
```

### Updating Ticket Status

```typescript
await linear.updateStatus('ENG-123', 'In Progress', {
  token: process.env.LINEAR_API_KEY,
  teamId: 'team-123',
})
```

### Adding Comments

```typescript
await linear.addComment('ENG-123', 'PR created: https://github.com/...', {
  token: process.env.LINEAR_API_KEY,
  teamId: 'team-123',
})
```

## Interface

```typescript
interface TicketProvider {
  name: 'linear' | 'notion' | 'jira'

  fetchReadyTickets(config: ProviderConfig): Promise<TicketData[]>
  getTicket(externalId: string, config: ProviderConfig): Promise<TicketData | null>
  updateStatus(externalId: string, status: string, config: ProviderConfig): Promise<void>
  addComment(externalId: string, comment: string, config: ProviderConfig): Promise<void>
}

interface ProviderConfig {
  token: string
  projectId?: string
  workspaceId?: string
  teamId?: string
  [key: string]: unknown
}

interface TicketData {
  externalId: string
  externalUrl: string
  title: string
  description: string | null
  priority: 'urgent' | 'high' | 'medium' | 'low' | null
  labels: string[]
  dependsOn: string[]
  status: string
  rawData: unknown
}
```

## Provider Configuration

### Linear

```typescript
const config: ProviderConfig = {
  token: 'lin_api_...',
  teamId: 'TEAM-ID',  // Required
}
```

### Notion

```typescript
const config: ProviderConfig = {
  token: 'secret_...',
  workspaceId: 'workspace-id',
  projectId: 'database-id',  // Notion database ID
}
```

### Jira

```typescript
const config: ProviderConfig = {
  token: 'jira-api-token',
  projectId: 'PROJECT-KEY',
  // Additional Jira-specific config
  baseUrl: 'https://your-domain.atlassian.net',
  email: 'user@example.com',
}
```

## Dependencies

- `@claudeswarm/shared` - Shared types and errors
