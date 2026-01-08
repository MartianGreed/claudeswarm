export class ClaudeSwarmError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'ClaudeSwarmError'
  }
}

export class TicketProviderError extends ClaudeSwarmError {
  constructor(message: string, provider: string) {
    super(message, `TICKET_PROVIDER_${provider.toUpperCase()}`)
    this.name = 'TicketProviderError'
  }
}

export class VcsError extends ClaudeSwarmError {
  constructor(message: string, provider: string) {
    super(message, `VCS_${provider.toUpperCase()}`)
    this.name = 'VcsError'
  }
}

export class SandboxError extends ClaudeSwarmError {
  constructor(message: string) {
    super(message, 'SANDBOX')
    this.name = 'SandboxError'
  }
}

export class ClaudeExecutorError extends ClaudeSwarmError {
  constructor(message: string) {
    super(message, 'CLAUDE_EXECUTOR')
    this.name = 'ClaudeExecutorError'
  }
}

export class AuthError extends ClaudeSwarmError {
  constructor(message: string, code = 'AUTH') {
    super(message, code)
    this.name = 'AuthError'
  }
}
