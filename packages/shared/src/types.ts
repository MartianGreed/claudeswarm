export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface TicketData {
  externalId: string
  externalUrl: string
  title: string
  description: string | null
  priority: TicketPriority | null
  labels: string[]
  dependsOn: string[]
  status: string
  rawData: unknown
}

export interface ProviderConfig {
  token: string
  projectId?: string
  workspaceId?: string
  teamId?: string
  [key: string]: unknown
}

export interface CreatePRParams {
  repoUrl: string
  token: string
  title: string
  body: string
  sourceBranch: string
  targetBranch: string
}

export interface PRResult {
  url: string
  number: number
}

export interface JobPayload {
  jobId: string
  projectId: string
  ticketId: string
  externalTicketId: string
  repoUrl: string
  defaultBranch: string
  vcsProvider: 'github' | 'gitlab'
  vcsToken: string
  title: string
  description: string
  maxIterations: number
  completionPromise: string | null
  sandboxBasePath: string
  claudeMdTemplate: string | null
  sandboxPath?: string | null
  branchName?: string | null
}

export interface ClaudeLoopState {
  iteration: number
  maxIterations: number
  completionPromise: string | null
  prompt: string
  isComplete: boolean
  needsClarification: boolean
  clarificationQuestion: string | null
  lastOutput: string | null
}

export interface ClaudeSignals {
  hasCompletionPromise: boolean
  needsClarification: boolean
  clarificationQuestion: string | null
  prCreated: boolean
  prUrl: string | null
}

export interface JobView {
  id: string
  ticketExternalId: string
  ticketTitle: string
  ticketUrl: string
  status: string
  iteration: number
  maxIterations: number
  prUrl: string | null
  clarificationQuestion: string | null
  startedAt: Date | null
  updatedAt: Date
}

export interface ProjectStats {
  projectId: string
  projectName: string
  activeJobs: number
  maxConcurrentJobs: number
  pendingJobs: number
  completedToday: number
  failedToday: number
  needsClarification: number
}
