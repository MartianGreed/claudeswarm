import { ClaudeExecutorError } from '@claudeswarm/shared'
import type { Subprocess } from 'bun'

export interface ExecutorConfig {
  sandboxPath: string
  prompt: string
  timeout: number
  onOutput?: (chunk: string) => void
}

export interface ExecutorResult {
  output: string
  exitCode: number
}

export class ClaudeExecutor {
  private proc: Subprocess | null = null
  private abortController: AbortController

  constructor(private config: ExecutorConfig) {
    this.abortController = new AbortController()
  }

  async execute(): Promise<ExecutorResult> {
    const { sandboxPath, prompt, timeout, onOutput } = this.config

    // Spawn Claude Code CLI in non-interactive mode
    // Permissions are configured via .claude/settings.local.json in sandbox
    this.proc = Bun.spawn(
      ['claude', '--print', '--max-turns', '50', '--output-format', 'text', prompt],
      {
        cwd: sandboxPath,
        env: {
          ...process.env,
          CLAUDE_VCS: 'jj',
          ANTHROPIC_API_KEY: undefined, // Force subscription mode
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    // Set timeout
    const timeoutId = setTimeout(() => {
      this.abort('Timeout exceeded')
    }, timeout)

    // Collect output
    let output = ''

    try {
      const stdout = this.proc.stdout
      if (!stdout || typeof stdout === 'number') {
        throw new ClaudeExecutorError('stdout is not a readable stream')
      }

      const reader = stdout.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        output += chunk
        onOutput?.(chunk)
      }
    } catch (error) {
      if (this.abortController.signal.aborted) {
        throw new ClaudeExecutorError(`Execution aborted: ${this.abortController.signal.reason}`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    const exitCode = await this.proc.exited

    return { output, exitCode }
  }

  abort(reason: string): void {
    this.abortController.abort(reason)
    this.proc?.kill()
  }
}
