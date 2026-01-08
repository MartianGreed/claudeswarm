import type { ProviderConfig, TicketData } from '@claudeswarm/shared'

export type TicketProviderName = 'linear' | 'notion' | 'jira'

export interface TicketProvider {
  name: TicketProviderName

  fetchReadyTickets(config: ProviderConfig): Promise<TicketData[]>

  getTicket(externalId: string, config: ProviderConfig): Promise<TicketData | null>

  updateStatus(externalId: string, status: string, config: ProviderConfig): Promise<void>

  addComment(externalId: string, comment: string, config: ProviderConfig): Promise<void>
}

export interface TicketProviderFactory {
  create(name: TicketProviderName): TicketProvider
}
