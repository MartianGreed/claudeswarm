export const env = {
  PORT: Number.parseInt(process.env.API_PORT || '3000', 10),
  HOST: process.env.API_HOST || 'localhost',
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://claudeswarm:claudeswarm@localhost:5432/claudeswarm',
  AUTH_SECRET: process.env.AUTH_SECRET || 'development-secret-min-32-chars!!',
  ALLOWED_EMAIL_DOMAINS: (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').filter(Boolean),
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@claudeswarm.dev',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0'.repeat(64),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .filter(Boolean),
}
