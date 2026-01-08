import type { CreatePRParams, PRResult } from '@claudeswarm/shared'
import { VcsError } from '@claudeswarm/shared'
import type { VcsConfig, VcsProvider } from './interface'

export class GitLabProvider implements VcsProvider {
  name = 'gitlab' as const

  async clone(_repoUrl: string, _targetPath: string, _token: string): Promise<void> {
    // TODO: Implement GitLab clone
    throw new VcsError('GitLab provider not yet implemented', this.name)
  }

  async createBranch(_branchName: string, _sandboxPath: string): Promise<void> {
    // TODO: Implement GitLab branch creation
    throw new VcsError('GitLab provider not yet implemented', this.name)
  }

  async push(_sandboxPath: string, _branchName: string): Promise<void> {
    // TODO: Implement GitLab push
    throw new VcsError('GitLab provider not yet implemented', this.name)
  }

  async createPR(_params: CreatePRParams): Promise<PRResult> {
    // TODO: Implement GitLab MR creation
    throw new VcsError('GitLab provider not yet implemented', this.name)
  }

  async addPRComment(_prNumber: number, _comment: string, _config: VcsConfig): Promise<void> {
    // TODO: Implement GitLab MR comment
    throw new VcsError('GitLab provider not yet implemented', this.name)
  }
}
