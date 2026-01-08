import { createDbClient, organizations, sessions, users } from '@claudeswarm/db'
import { AuthError, generateId } from '@claudeswarm/shared'
import { eq, sql } from 'drizzle-orm'
import { env } from '../env'

const db = createDbClient(env.DATABASE_URL)

export async function sendMagicLink(email: string): Promise<{ success: boolean }> {
  const domain = email.split('@')[1]

  // Check if domain is allowed in any organization
  const org = await db.query.organizations.findFirst({
    where: sql`${domain} = ANY(${organizations.allowedDomains})`,
  })

  if (!org && env.ALLOWED_EMAIL_DOMAINS.length > 0 && !env.ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    throw new AuthError('Email domain not allowed', 'DOMAIN_NOT_ALLOWED')
  }

  // Generate magic link token
  const token = generateId(32)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // TODO: Store token in database or cache with email and expiry
  // TODO: Send email with magic link

  console.log(`[AUTH] Magic link for ${email}: ${token}`)

  return { success: true }
}

export async function verifyMagicLink(
  token: string,
): Promise<{ sessionToken: string; user: typeof users.$inferSelect }> {
  // TODO: Verify token from database/cache
  // For now, extract email from token (in production, look up token)

  // This is a placeholder - in production, verify the token
  throw new AuthError('Magic link verification not implemented', 'NOT_IMPLEMENTED')
}

export async function getOrCreateUser(email: string): Promise<typeof users.$inferSelect> {
  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!user) {
    const domain = email.split('@')[1]
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        emailDomain: domain,
      })
      .returning()
    user = newUser
  }

  return user
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateId(32)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.insert(sessions).values({
    id: sessionToken,
    userId,
    expiresAt,
  })

  return sessionToken
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionToken))
}
