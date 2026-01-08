import type { JobPayload } from '@claudeswarm/shared'

export const QUEUE_NAMES = {
  JOB_PROCESS: 'job:process',
  JOB_RESUME: 'job:resume',
  JOB_CANCEL: 'job:cancel',
  TICKET_SYNC: 'ticket:sync',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export interface JobProcessPayload extends JobPayload {}

export interface JobResumePayload {
  jobId: string
  answer: string
}

export interface JobCancelPayload {
  jobId: string
}

export interface TicketSyncPayload {
  projectId: string
}

export type QueuePayloadMap = {
  [QUEUE_NAMES.JOB_PROCESS]: JobProcessPayload
  [QUEUE_NAMES.JOB_RESUME]: JobResumePayload
  [QUEUE_NAMES.JOB_CANCEL]: JobCancelPayload
  [QUEUE_NAMES.TICKET_SYNC]: TicketSyncPayload
}
