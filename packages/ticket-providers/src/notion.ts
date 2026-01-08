import type { ProviderConfig, TicketData } from '@claudeswarm/shared'
import { TicketProviderError } from '@claudeswarm/shared'
import type { TicketProvider } from './interface'

export class NotionProvider implements TicketProvider {
  name = 'notion' as const

  async fetchReadyTickets(config: ProviderConfig): Promise<TicketData[]> {
    // TODO: Implement Notion API integration
    // 1. Query database with status filter
    // 2. Map properties to TicketData format
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async getTicket(externalId: string, config: ProviderConfig): Promise<TicketData | null> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async updateStatus(externalId: string, status: string, config: ProviderConfig): Promise<void> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }

  async addComment(externalId: string, comment: string, config: ProviderConfig): Promise<void> {
    // TODO: Implement Notion API integration
    throw new TicketProviderError('Notion provider not yet implemented', this.name)
  }
}
