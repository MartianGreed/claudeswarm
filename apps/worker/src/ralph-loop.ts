import { createDbClient, jobLogs, jobs } from '@claudeswarm/db'
import {
  type ClaudeLoopState,
  type ClaudeSignals,
  type JobPayload,
  extractPRNumber,
  extractPRUrl,
  parseClarificationTags,
  parsePermissionRequest,
  parsePromiseTags,
} from '@claudeswarm/shared'
import { createTicketProvider } from '@claudeswarm/ticket-providers'
import { eq } from 'drizzle-orm'
import { env } from './env'
import { ClaudeExecutor } from './executor'
import { SandboxManager } from './sandbox'

const db = createDbClient(env.DATABASE_URL)

export class RalphLoop {
  private state: ClaudeLoopState
  private sandbox: SandboxManager
  private sandboxPath: string | null = null
  private branchName: string | null = null

  constructor(private job: JobPayload) {
    this.sandbox = new SandboxManager(job.sandboxBasePath)
    this.state = {
      iteration: 0,
      maxIterations: job.maxIterations,
      completionPromise: job.completionPromise,
      prompt: '',
      isComplete: false,
      needsClarification: false,
      clarificationQuestion: null,
      lastOutput: null,
    }
    this.state.prompt = this.buildPrompt()
  }

  private async sandboxExists(path: string): Promise<boolean> {
    try {
      const gitDir = Bun.file(`${path}/.git`)
      const jjDir = Bun.file(`${path}/.jj`)
      return (await gitDir.exists()) || (await jjDir.exists())
    } catch {
      return false
    }
  }

  private async updateTicketStatus(status: string): Promise<void> {
    try {
      const provider = createTicketProvider(this.job.ticketProvider)
      await provider.updateStatus(this.job.externalTicketId, status, {
        token: this.job.ticketProviderToken,
        ...this.job.ticketProviderConfig,
      })
    } catch (error) {
      console.error(`Failed to update ticket status: ${error}`)
    }
  }

  private async addTicketComment(comment: string): Promise<void> {
    try {
      const provider = createTicketProvider(this.job.ticketProvider)
      await provider.addComment(this.job.externalTicketId, comment, {
        token: this.job.ticketProviderToken,
        ...this.job.ticketProviderConfig,
      })
    } catch (error) {
      console.error(`Failed to add ticket comment: ${error}`)
    }
  }

  async run(): Promise<void> {
    // Check if sandbox already exists (from previous run)
    if (this.job.sandboxPath && (await this.sandboxExists(this.job.sandboxPath))) {
      console.log(`Reusing existing sandbox: ${this.job.sandboxPath}`)
      this.sandboxPath = this.job.sandboxPath
      this.branchName = this.job.branchName || `claudeswarm/${this.job.externalTicketId}`
    } else {
      // Create new sandbox
      const { sandboxPath, branchName } = await this.sandbox.create(this.job)
      this.sandboxPath = sandboxPath
      this.branchName = branchName
    }

    // Update job with sandbox info
    await db
      .update(jobs)
      .set({
        sandboxPath: this.sandboxPath,
        branchName: this.branchName,
        status: 'running',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    // Mark ticket as in progress in ticket provider
    await this.updateTicketStatus('In Progress')

    try {
      await this.executeLoop()
    } catch (error) {
      await this.handleError(error as Error)
    }
  }

  private async executeLoop(): Promise<void> {
    while (!this.state.isComplete && this.state.iteration < this.state.maxIterations) {
      this.state.iteration++

      // Update job iteration
      await db
        .update(jobs)
        .set({
          iteration: this.state.iteration,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, this.job.jobId))

      // Log iteration start
      await db.insert(jobLogs).values({
        jobId: this.job.jobId,
        iteration: this.state.iteration,
        eventType: 'iteration_start',
        eventData: { prompt: this.state.prompt.slice(0, 1000) },
      })

      // Execute Claude
      const executor = new ClaudeExecutor({
        sandboxPath: this.sandboxPath!,
        prompt: this.state.prompt,
        timeout: 10 * 60 * 1000, // 10 minutes per iteration
        onOutput: (_chunk) => {
          // Could stream to real-time updates here
        },
      })

      const { output, exitCode } = await executor.execute()
      this.state.lastOutput = output

      // Parse output for signals
      const signals = this.parseClaudeOutput(output)

      // Log iteration end
      await db.insert(jobLogs).values({
        jobId: this.job.jobId,
        iteration: this.state.iteration,
        eventType: 'iteration_end',
        eventData: { exitCode, signals },
        claudeOutput: output.slice(0, 50000),
      })

      // Check for completion promise
      if (signals.hasCompletionPromise) {
        this.state.isComplete = true
        await this.handleCompletion()
        break
      }

      // Check for clarification request
      if (signals.needsClarification) {
        this.state.needsClarification = true
        this.state.clarificationQuestion = signals.clarificationQuestion
        await this.handleClarificationRequest()
        break
      }

      // Check for permission request
      if (signals.needsPermission && signals.permissionRequest) {
        await this.handlePermissionRequest(signals.permissionRequest)
        break
      }

      // Check for PR creation signal
      if (signals.prCreated && signals.prUrl) {
        this.state.isComplete = true
        await this.handlePRCreated(signals.prUrl)
        break
      }
    }

    if (this.state.iteration >= this.state.maxIterations && !this.state.isComplete) {
      await this.handleMaxIterationsReached()
    }
  }

  private parseClaudeOutput(output: string): ClaudeSignals {
    const signals: ClaudeSignals = {
      hasCompletionPromise: false,
      needsClarification: false,
      clarificationQuestion: null,
      needsPermission: false,
      permissionRequest: null,
      prCreated: false,
      prUrl: null,
    }

    // Check for completion promise
    if (this.state.completionPromise) {
      const promiseContent = parsePromiseTags(output)
      if (promiseContent === this.state.completionPromise) {
        signals.hasCompletionPromise = true
      }
    }

    // Check for clarification request
    const clarificationContent = parseClarificationTags(output)
    if (clarificationContent) {
      signals.needsClarification = true
      signals.clarificationQuestion = clarificationContent
    }

    // Check for permission request
    const permissionRequest = parsePermissionRequest(output)
    if (permissionRequest) {
      signals.needsPermission = true
      signals.permissionRequest = permissionRequest
    }

    // Check for PR URL
    const prUrl = extractPRUrl(output)
    if (prUrl) {
      signals.prCreated = true
      signals.prUrl = prUrl
    }

    return signals
  }

  private buildPrompt(): string {
    let commentsSection = ''
    if (this.job.ticketComments?.length) {
      commentsSection = '\n\n## Comments from ticket\n'
      for (const c of this.job.ticketComments) {
        commentsSection += `\n**${c.author || 'Unknown'}** (${c.createdAt}):\n${c.body}\n`
      }
    }

    return `
# Task: ${this.job.title}

${this.job.description || 'No description provided.'}
${commentsSection}
## Instructions

Work on this task iteratively. You have access to the full codebase.
Use jj for version control (not git directly).

When you have completed the task:
1. Create a PR using \`gh pr create\`
2. Output: <promise>${this.job.completionPromise || 'TASK COMPLETE'}</promise>

If you need clarification from the user:
- Output: <clarification>Your specific question here</clarification>
- Then stop and wait for the answer.

Current iteration: ${this.state.iteration}/${this.state.maxIterations}
    `.trim()
  }

  private async handleCompletion(): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'completed',
    })

    // Add completion comment to ticket
    await this.addTicketComment('ClaudeSwarm has completed work on this issue.')

    // Cleanup sandbox
    if (this.sandboxPath) {
      await this.sandbox.cleanup(this.sandboxPath)
    }
  }

  private async handleClarificationRequest(): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: 'needs_clarification',
        clarificationQuestion: this.state.clarificationQuestion,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'clarification_requested',
      eventData: { question: this.state.clarificationQuestion },
    })

    // TODO: Post comment to ticket
    // const ticketProvider = createTicketProvider(...)
    // await ticketProvider.addComment(this.job.externalTicketId, ...)
  }

  private async handlePermissionRequest(command: string): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: 'needs_permission',
        pendingPermissionRequest: command,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'permission_requested',
      eventData: { command },
    })
  }

  private async handlePRCreated(prUrl: string): Promise<void> {
    const prNumber = extractPRNumber(prUrl)

    await db
      .update(jobs)
      .set({
        status: 'pr_created',
        prUrl,
        prNumber,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'pr_created',
      eventData: { prUrl, prNumber },
    })

    // Add comment to ticket with PR link
    await this.addTicketComment(
      `ClaudeSwarm has created a PR for this issue:\n\n${prUrl}\n\nPlease review and merge when ready.`,
    )
  }

  private async handleMaxIterationsReached(): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        errorMessage: `Max iterations (${this.state.maxIterations}) reached without completion`,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'max_iterations_reached',
    })

    // Keep sandbox for retry - only cleanup on success
  }

  private async handleError(error: Error): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: 'failed',
        errorMessage: error.message,
        errorStack: error.stack,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: 'error',
      eventData: { message: error.message, stack: error.stack },
    })

    // Keep sandbox on error for retry - only cleanup on success
  }

  async resumeWithAnswer(answer: string): Promise<void> {
    this.state.needsClarification = false
    this.state.clarificationQuestion = null

    // Update prompt with answer
    this.state.prompt = `
Previous question: ${this.state.clarificationQuestion}

Human answer: ${answer}

Continue working on the task with this information.

${this.buildPrompt()}
    `.trim()

    // Update job
    await db
      .update(jobs)
      .set({
        clarificationAnswer: answer,
        status: 'running',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await this.executeLoop()
  }

  async resumeWithPermission(approved: boolean, command: string): Promise<void> {
    if (approved) {
      // Update prompt to continue with approved command
      this.state.prompt = `
The following command was approved: ${command}

Please proceed with the task. The command has been approved and you can execute it.

${this.buildPrompt()}
      `.trim()
    } else {
      // Command denied - ask Claude to find alternative
      this.state.prompt = `
The following command was denied: ${command}

Please find an alternative approach that doesn't require this command, or ask for clarification if you need more information.

${this.buildPrompt()}
      `.trim()
    }

    // Update job
    await db
      .update(jobs)
      .set({
        pendingPermissionRequest: null,
        status: 'running',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

    await db.insert(jobLogs).values({
      jobId: this.job.jobId,
      iteration: this.state.iteration,
      eventType: approved ? 'permission_approved' : 'permission_denied',
      eventData: { command },
    })

    await this.executeLoop()
  }
}
