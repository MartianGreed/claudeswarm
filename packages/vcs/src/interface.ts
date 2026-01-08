import type { CreatePRParams, PRResult } from '@claudeswarm/shared'

export type VcsProviderName = 'github' | 'gitlab'

export interface VcsConfig {
  token: string
  owner: string
  repo: string
}

export interface VcsProvider {
  name: VcsProviderName

  clone(repoUrl: string, targetPath: string, token: string): Promise<void>

  createBranch(branchName: string, sandboxPath: string): Promise<void>

  push(sandboxPath: string, branchName: string): Promise<void>

  createPR(params: CreatePRParams): Promise<PRResult>

  addPRComment(prNumber: number, comment: string, config: VcsConfig): Promise<void>
}

export interface VcsProviderFactory {
  create(name: VcsProviderName): VcsProvider
}
