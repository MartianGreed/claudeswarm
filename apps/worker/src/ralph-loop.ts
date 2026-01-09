import { createDbClient, jobLogs, jobs } from '@claudeswarm/db'
import {
  type ClaudeLoopState,
  type ClaudeSignals,
  type JobPayload,
  extractPRNumber,
  extractPRUrl,
  parseClarificationTags,
  parsePromiseTags,
} from '@claudeswarm/shared'
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

  async run(): Promise<void> {
    // Setup sandbox
    const { sandboxPath, branchName } = await this.sandbox.create(this.job)
    this.sandboxPath = sandboxPath
    this.branchName = branchName

    // Update job with sandbox info
    await db
      .update(jobs)
      .set({
        sandboxPath,
        branchName,
        status: 'running',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, this.job.jobId))

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

    // Check for PR URL
    const prUrl = extractPRUrl(output)
    if (prUrl) {
      signals.prCreated = true
      signals.prUrl = prUrl
    }

    return signals
  }

  private buildPrompt(): string {
    return `
# Task: ${this.job.title}

${this.job.description || 'No description provided.'}

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

    // Cleanup sandbox
    if (this.sandboxPath) {
      await this.sandbox.cleanup(this.sandboxPath)
    }
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

    // Cleanup sandbox
    if (this.sandboxPath) {
      await this.sandbox.cleanup(this.sandboxPath)
    }
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
}
