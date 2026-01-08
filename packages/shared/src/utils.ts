export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function parsePromiseTags(output: string): string | null {
  const match = output.match(/<promise>(.*?)<\/promise>/s)
  return match ? match[1].trim() : null
}

export function parseClarificationTags(output: string): string | null {
  const match = output.match(/<clarification>(.*?)<\/clarification>/s)
  return match ? match[1].trim() : null
}

export function extractPRUrl(output: string): string | null {
  const githubMatch = output.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/)
  if (githubMatch) return githubMatch[0]

  const gitlabMatch = output.match(/https:\/\/gitlab\.com\/[^\/]+\/[^\/]+\/-\/merge_requests\/\d+/)
  if (gitlabMatch) return gitlabMatch[0]

  return null
}

export function extractPRNumber(prUrl: string): number | null {
  const match = prUrl.match(/\/(?:pull|merge_requests)\/(\d+)/)
  return match ? Number.parseInt(match[1], 10) : null
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: boolean } = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true } = options

  return (async () => {
    let lastError: Error | undefined
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxAttempts) {
          const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs
          await wait(delay)
        }
      }
    }
    throw lastError
  })()
}
