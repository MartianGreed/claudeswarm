import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { type JobPayload, SandboxError, slugify } from '@claudeswarm/shared'
import simpleGit from 'simple-git'

export class SandboxManager {
  constructor(private basePath: string) {}

  async create(job: JobPayload): Promise<{ sandboxPath: string; branchName: string }> {
    const sandboxId = `${job.projectId.slice(0, 8)}-${job.jobId.slice(0, 8)}-${Date.now()}`
    const sandboxPath = join(this.basePath, sandboxId)
    const branchName = this.generateBranchName(job)

    try {
      await mkdir(sandboxPath, { recursive: true })

      // Clone repository
      const authenticatedUrl = this.addTokenToUrl(job.repoUrl, job.vcsToken)
      const git = simpleGit()
      await git.clone(authenticatedUrl, sandboxPath, [
        '--depth',
        '1',
        '--branch',
        job.defaultBranch,
      ])

      // Create feature branch
      const repoGit = simpleGit(sandboxPath)
      await repoGit.checkoutLocalBranch(branchName)

      // Initialize jj on top of git
      const proc = Bun.spawn(['jj', 'git', 'init', '--colocate'], {
        cwd: sandboxPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await proc.exited

      // Write CLAUDE.md if template provided
      if (job.claudeMdTemplate) {
        await Bun.write(join(sandboxPath, 'CLAUDE.md'), job.claudeMdTemplate)
      }

      return { sandboxPath, branchName }
    } catch (error) {
      throw new SandboxError(`Failed to create sandbox: ${error}`)
    }
  }

  async cleanup(sandboxPath: string): Promise<void> {
    try {
      await rm(sandboxPath, { recursive: true, force: true })
    } catch (error) {
      console.error(`Failed to cleanup sandbox ${sandboxPath}:`, error)
    }
  }

  private generateBranchName(job: JobPayload): string {
    const slug = slugify(job.title).slice(0, 40)
    return `claudeswarm/${job.externalTicketId}-${slug}`
  }

  private addTokenToUrl(repoUrl: string, token: string): string {
    if (repoUrl.startsWith('git@')) {
      const path = repoUrl.replace('git@github.com:', '').replace('.git', '')
      return `https://${token}@github.com/${path}.git`
    }

    if (repoUrl.startsWith('https://github.com')) {
      const path = repoUrl.replace('https://github.com/', '').replace('.git', '')
      return `https://${token}@github.com/${path}.git`
    }

    return repoUrl
  }
}
