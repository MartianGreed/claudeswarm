import type { ProviderConfig, TicketData } from '@claudeswarm/shared'
import { TicketProviderError } from '@claudeswarm/shared'
import type { TicketProvider } from './interface'

export class LinearProvider implements TicketProvider {
  name = 'linear' as const

  async fetchReadyTickets(config: ProviderConfig): Promise<TicketData[]> {
    // TODO: Implement Linear API integration
    // 1. Query issues with status "Todo" or "In Progress"
    // 2. Filter by team/project from config
    // 3. Map to TicketData format
    throw new TicketProviderError('Linear provider not yet implemented', this.name)
  }

  async getTicket(externalId: string, config: ProviderConfig): Promise<TicketData | null> {
    // TODO: Implement Linear API integration
    throw new TicketProviderError('Linear provider not yet implemented', this.name)
  }

  async updateStatus(externalId: string, status: string, config: ProviderConfig): Promise<void> {
    // TODO: Implement Linear API integration
    throw new TicketProviderError('Linear provider not yet implemented', this.name)
  }

  async addComment(externalId: string, comment: string, config: ProviderConfig): Promise<void> {
    // TODO: Implement Linear API integration
    throw new TicketProviderError('Linear provider not yet implemented', this.name)
  }
}
