import type { ProviderConfig, TicketData, TicketPriority } from '@claudeswarm/shared'
import { TicketProviderError } from '@claudeswarm/shared'
import { type Issue, LinearClient } from '@linear/sdk'
import type { TicketProvider } from './interface'

function mapPriority(linearPriority: number): TicketPriority | null {
  switch (linearPriority) {
    case 1:
      return 'urgent'
    case 2:
      return 'high'
    case 3:
      return 'medium'
    case 4:
      return 'low'
    default:
      return null
  }
}

async function mapToTicketData(issue: Issue): Promise<TicketData> {
  const labels = await issue.labels()
  const state = await issue.state
  const commentsData = await issue.comments()

  const comments = await Promise.all(
    commentsData.nodes.map(async (c) => {
      const user = await c.user
      return {
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: user?.name || null,
      }
    }),
  )

  return {
    externalId: issue.id,
    externalUrl: issue.url,
    title: issue.title,
    description: issue.description || null,
    priority: mapPriority(issue.priority),
    labels: labels.nodes.map((l) => l.name),
    dependsOn: [],
    status: state?.name || 'Unknown',
    comments,
    rawData: issue,
  }
}

export class LinearProvider implements TicketProvider {
  name = 'linear' as const

  private createClient(config: ProviderConfig): LinearClient {
    if (!config.token) {
      throw new TicketProviderError('Linear API token is required', this.name)
    }
    return new LinearClient({ apiKey: config.token })
  }

  async fetchReadyTickets(config: ProviderConfig): Promise<TicketData[]> {
    const client = this.createClient(config)

    if (!config.teamId) {
      throw new TicketProviderError('teamId is required in config', this.name)
    }

    try {
      const team = await client.team(config.teamId as string)
      if (!team) {
        throw new TicketProviderError(`Team "${config.teamId}" not found`, this.name)
      }

      const issues = await team.issues({
        filter: {
          state: { type: { in: ['backlog', 'unstarted'] } },
        },
      })

      const ticketPromises = issues.nodes.map((issue) => mapToTicketData(issue))
      return Promise.all(ticketPromises)
    } catch (error) {
      if (error instanceof TicketProviderError) throw error
      throw new TicketProviderError(
        `Failed to fetch Linear issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
      )
    }
  }

  async getTicket(externalId: string, config: ProviderConfig): Promise<TicketData | null> {
    const client = this.createClient(config)

    try {
      const issue = await client.issue(externalId)
      if (!issue) {
        return null
      }
      return mapToTicketData(issue)
    } catch (error) {
      throw new TicketProviderError(
        `Failed to get Linear issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
      )
    }
  }

  async updateStatus(externalId: string, status: string, config: ProviderConfig): Promise<void> {
    const client = this.createClient(config)

    try {
      const issue = await client.issue(externalId)
      if (!issue) {
        throw new TicketProviderError(`Issue ${externalId} not found`, this.name)
      }

      const team = await issue.team
      if (!team) {
        throw new TicketProviderError(`Team not found for issue ${externalId}`, this.name)
      }

      const states = await team.states()
      const targetState = states.nodes.find((s) => s.name.toLowerCase() === status.toLowerCase())

      if (!targetState) {
        throw new TicketProviderError(`Status "${status}" not found in team workflow`, this.name)
      }

      await issue.update({ stateId: targetState.id })
    } catch (error) {
      if (error instanceof TicketProviderError) throw error
      throw new TicketProviderError(
        `Failed to update Linear issue status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
      )
    }
  }

  async addComment(externalId: string, comment: string, config: ProviderConfig): Promise<void> {
    const client = this.createClient(config)

    try {
      await client.createComment({ issueId: externalId, body: comment })
    } catch (error) {
      throw new TicketProviderError(
        `Failed to add comment to Linear issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
      )
    }
  }
}
