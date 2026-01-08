import { createDbClient, sessions } from '@claudeswarm/db'
import { and, eq, gt } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import { env } from '../env'

const db = createDbClient(env.DATABASE_URL)

export interface AuthUser {
  id: string
  email: string
  name: string | null
  organizationId: string | null
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  if (!sessionToken) {
    c.set('user', null)
    return next()
  }

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, new Date())),
    with: {
      user: true,
    },
  })

  if (!session) {
    c.set('user', null)
    return next()
  }

  // Get user's organization
  const orgMember = await db.query.organizationMembers.findFirst({
    where: eq((await import('@claudeswarm/db')).organizationMembers.userId, session.user.id),
  })

  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: orgMember?.organizationId || null,
  })

  return next()
}

export function requireAuth(c: Context, next: Next) {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}
