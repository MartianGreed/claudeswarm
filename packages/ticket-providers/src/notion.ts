import type { ProviderConfig, TicketData } from '@claudeswarm/shared'
import { TicketProviderError } from '@claudeswarm/shared'
import type { TicketProvider } from './interface'

export class NotionProvider implements TicketProvider {
  name = 'notion' as const

  async fetchReadyTickets(_config: ProviderConfig): Promise<TicketData[]> {
    // TODO: Implement Notion API integration
    // 1. Query database with status filter
    // 2. Map properties to TicketData format
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async getTicket(_externalId: string, _config: ProviderConfig): Promise<TicketData | null> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async updateStatus(_externalId: string, _status: string, _config: ProviderConfig): Promise<void> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async addComment(_externalId: string, _comment: string, _config: ProviderConfig): Promise<void> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }
}
