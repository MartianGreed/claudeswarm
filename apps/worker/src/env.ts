export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://claudeswarm:claudeswarm@localhost:5432/claudeswarm',
  SANDBOX_BASE_PATH: process.env.WORKER_SANDBOX_BASE_PATH || '/tmp/claudeswarm/sandboxes',
  WORKER_ID: process.env.WORKER_ID || `worker-${Date.now()}`,
  CONCURRENCY: Number.parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
}
