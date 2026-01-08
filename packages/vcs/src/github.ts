import type { CreatePRParams, PRResult } from '@claudeswarm/shared'
import { VcsError } from '@claudeswarm/shared'
import simpleGit from 'simple-git'
import type { VcsConfig, VcsProvider } from './interface'

export class GitHubProvider implements VcsProvider {
  name = 'github' as const

  async clone(repoUrl: string, targetPath: string, token: string): Promise<void> {
    const authenticatedUrl = this.addTokenToUrl(repoUrl, token)
    const git = simpleGit()

    try {
      await git.clone(authenticatedUrl, targetPath, ['--depth', '1'])
    } catch (error) {
      throw new VcsError(`Failed to clone repository: ${error}`, this.name)
    }
  }

  async createBranch(branchName: string, sandboxPath: string): Promise<void> {
    const git = simpleGit(sandboxPath)

    try {
      await git.checkoutLocalBranch(branchName)
    } catch (error) {
      throw new VcsError(`Failed to create branch: ${error}`, this.name)
    }
  }

  async push(sandboxPath: string, branchName: string): Promise<void> {
    const git = simpleGit(sandboxPath)

    try {
      await git.push('origin', branchName, ['--set-upstream'])
    } catch (error) {
      throw new VcsError(`Failed to push branch: ${error}`, this.name)
    }
  }

  async createPR(params: CreatePRParams): Promise<PRResult> {
    const { repoUrl, token, title, body, sourceBranch, targetBranch } = params
    const { owner, repo } = this.parseRepoUrl(repoUrl)

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head: sourceBranch,
        base: targetBranch,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new VcsError(`Failed to create PR: ${error}`, this.name)
    }

    const data = (await response.json()) as { html_url: string; number: number }
    return {
      url: data.html_url,
      number: data.number,
    }
  }

  async addPRComment(prNumber: number, comment: string, config: VcsConfig): Promise<void> {
    const { token, owner, repo } = config

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: comment }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new VcsError(`Failed to add PR comment: ${error}`, this.name)
    }
  }

  private addTokenToUrl(repoUrl: string, token: string): string {
    if (repoUrl.startsWith('git@')) {
      const httpsUrl = repoUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '')
      return `https://${token}@github.com/${httpsUrl.split('github.com/')[1]}.git`
    }

    if (repoUrl.startsWith('https://')) {
      const urlParts = repoUrl.replace('https://', '').split('/')
      return `https://${token}@${urlParts.join('/')}`
    }

    return repoUrl
  }

  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    let path: string

    if (repoUrl.startsWith('git@')) {
      path = repoUrl.replace('git@github.com:', '').replace('.git', '')
    } else if (repoUrl.startsWith('https://')) {
      path = repoUrl.replace('https://github.com/', '').replace('.git', '')
    } else {
      throw new VcsError(`Invalid repository URL: ${repoUrl}`, this.name)
    }

    const [owner, repo] = path.split('/')
    if (!owner || !repo) {
      throw new VcsError(`Invalid repository URL: ${repoUrl}`, this.name)
    }

    return { owner, repo }
  }
}
