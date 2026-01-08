import type { TicketProvider, TicketProviderFactory, TicketProviderName } from './interface'
import { JiraProvider } from './jira'
import { LinearProvider } from './linear'
import { NotionProvider } from './notion'

const providers: Record<TicketProviderName, new () => TicketProvider> = {
  linear: LinearProvider,
  notion: NotionProvider,
  jira: JiraProvider,
}

export function createTicketProvider(name: TicketProviderName): TicketProvider {
  const Provider = providers[name]
  if (!Provider) {
    throw new Error(`Unknown ticket provider: ${name}`)
  }
  return new Provider()
}

export const ticketProviderFactory: TicketProviderFactory = {
  create: createTicketProvider,
}
