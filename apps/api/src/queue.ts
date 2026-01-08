import { createQueue } from '@claudeswarm/queue'
import { env } from './env'

export const queue = createQueue(env.DATABASE_URL)

let started = false

export async function startQueue(): Promise<void> {
  if (!started) {
    await queue.start()
    started = true
    console.log('Queue started')
  }
}

export async function stopQueue(): Promise<void> {
  if (started) {
    await queue.stop()
    started = false
    console.log('Queue stopped')
  }
}
