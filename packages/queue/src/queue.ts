import PgBoss from 'pg-boss'
import type { QueueName, QueuePayloadMap } from './types'

export class Queue {
  private boss: PgBoss

  constructor(connectionString: string) {
    this.boss = new PgBoss(connectionString)
  }

  async start(): Promise<void> {
    await this.boss.start()
  }

  async stop(): Promise<void> {
    await this.boss.stop()
  }

  async send<T extends QueueName>(name: T, data: QueuePayloadMap[T]): Promise<string | null> {
    return this.boss.send(name, data)
  }

  async sendAfter<T extends QueueName>(
    name: T,
    data: QueuePayloadMap[T],
    delaySeconds: number,
  ): Promise<string | null> {
    return this.boss.send(name, data, { startAfter: delaySeconds })
  }

  async subscribe<T extends QueueName>(
    name: T,
    handler: (job: PgBoss.Job<QueuePayloadMap[T]>) => Promise<void>,
  ): Promise<string> {
    return this.boss.work(name, async (jobs) => {
      const jobArray = Array.isArray(jobs) ? jobs : [jobs]
      for (const job of jobArray) {
        await handler(job as PgBoss.Job<QueuePayloadMap[T]>)
      }
    })
  }

  async cancel<T extends QueueName>(name: T, jobId: string): Promise<void> {
    await this.boss.cancel(name, jobId)
  }

  async getJob<T extends QueueName>(
    name: T,
    jobId: string,
  ): Promise<PgBoss.Job<QueuePayloadMap[T]> | null> {
    return this.boss.getJobById(name, jobId) as Promise<PgBoss.Job<QueuePayloadMap[T]> | null>
  }

  get instance(): PgBoss {
    return this.boss
  }
}

export function createQueue(connectionString: string): Queue {
  return new Queue(connectionString)
}
