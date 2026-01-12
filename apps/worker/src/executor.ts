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

interface StreamEvent {
  type: string
  subtype?: string
  message?: {
    content?: Array<{ type: string; text?: string }>
  }
  content_block?: {
    type: string
    text?: string
  }
  delta?: {
    type: string
    text?: string
  }
  result?: string
  content?: string
  tool_name?: string
  tool_input?: unknown
}

export class ClaudeExecutor {
  private proc: Subprocess | null = null
  private abortController: AbortController

  constructor(private config: ExecutorConfig) {
    this.abortController = new AbortController()
  }

  async execute(): Promise<ExecutorResult> {
    const { sandboxPath, prompt, timeout, onOutput } = this.config

    // Spawn Claude Code CLI in non-interactive mode with streaming output
    // Permissions are configured via .claude/settings.local.json in sandbox
    this.proc = Bun.spawn(
      [
        'claude',
        '--print',
        '--max-turns',
        '50',
        '--output-format',
        'stream-json',
        '--verbose',
        prompt,
      ],
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

    // Collect output - will contain all text content
    let output = ''
    let buffer = ''

    try {
      const stdout = this.proc.stdout
      if (!stdout || typeof stdout === 'number') {
        throw new ClaudeExecutorError('stdout is not a readable stream')
      }

      const reader = stdout.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += new TextDecoder().decode(value)

        // Process complete JSON lines (NDJSON format)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const event = JSON.parse(line) as StreamEvent
            const text = this.extractText(event)
            if (text) {
              output += text
              onOutput?.(text)
            }
          } catch {
            // Not JSON, treat as raw text (fallback for older CLI versions)
            output += line + '\n'
            onOutput?.(line + '\n')
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as StreamEvent
          const text = this.extractText(event)
          if (text) {
            output += text
            onOutput?.(text)
          }
        } catch {
          output += buffer
          onOutput?.(buffer)
        }
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

  private extractText(event: StreamEvent): string | null {
    // Handle different event types from Claude CLI stream-json
    switch (event.type) {
      case 'assistant':
        // Assistant message with content blocks
        if (event.message?.content) {
          const text = event.message.content
            .filter((block) => block.type === 'text' && block.text)
            .map((block) => block.text)
            .join('')
          return text ? '\n' + text : null
        }
        // Direct content field
        if (event.content) {
          return '\n' + event.content
        }
        break

      case 'content_block_delta':
        // Streaming text delta
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          return event.delta.text
        }
        break

      case 'content_block_start':
        // Start of a content block
        if (event.content_block?.type === 'text' && event.content_block.text) {
          return event.content_block.text
        }
        break

      case 'tool_use':
        // Show tool usage with clear separator
        if (event.tool_name) {
          return `\n\n━━━ Tool: ${event.tool_name} ━━━\n`
        }
        break

      case 'tool_result':
      case 'result':
        // Tool execution result with separator
        if (event.result) {
          const resultStr =
            typeof event.result === 'string' ? event.result : JSON.stringify(event.result)
          // Truncate very long results
          if (resultStr.length > 2000) {
            return resultStr.slice(0, 2000) + '... [truncated]\n━━━━━━━━━━━━━━━━━━\n\n'
          }
          return resultStr + '\n━━━━━━━━━━━━━━━━━━\n\n'
        }
        break
    }

    return null
  }

  abort(reason: string): void {
    this.abortController.abort(reason)
    this.proc?.kill()
  }
}
