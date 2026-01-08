import type { ProviderConfig, TicketData } from '@claudeswarm/shared'
import { TicketProviderError } from '@claudeswarm/shared'
import type { TicketProvider } from './interface'

export class JiraProvider implements TicketProvider {
  name = 'jira' as const

  async fetchReadyTickets(_config: ProviderConfig): Promise<TicketData[]> {
    // TODO: Implement Jira API integration
    // 1. Use JQL to query issues
    // 2. Filter by project/sprint from config
    // 3. Map to TicketData format
    throw new TicketProviderError('Jira provider not yet implemented', this.name)
  }

  async getTicket(_externalId: string, _config: ProviderConfig): Promise<TicketData | null> {
    // TODO: Implement Jira API integration
    throw new TicketProviderError('Jira provider not yet implemented', this.name)
  }

  async updateStatus(_externalId: string, _status: string, _config: ProviderConfig): Promise<void> {
    // TODO: Implement Jira API integration
    throw new TicketProviderError('Jira provider not yet implemented', this.name)
  }

  async addComment(_externalId: string, _comment: string, _config: ProviderConfig): Promise<void> {
    // TODO: Implement Jira API integration
    throw new TicketProviderError('Jira provider not yet implemented', this.name)
  }
}
