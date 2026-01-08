import {
  createDbClient,
  magicLinkTokens,
  organizationMembers,
  organizations,
  sessions,
  users,
} from '@claudeswarm/db'
import { AuthError, generateId } from '@claudeswarm/shared'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { Resend } from 'resend'
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

  // Store token in database
  await db.insert(magicLinkTokens).values({
    email,
    token,
    expiresAt,
  })

  // Build magic link URL
  const magicLinkUrl = `http://localhost:5173/verify?token=${token}`

  // Send email via Resend
  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Sign in to ClaudeSwarm',
      html: `
        <h2>Sign in to ClaudeSwarm</h2>
        <p>Click the link below to sign in:</p>
        <a href="${magicLinkUrl}">${magicLinkUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    })

    if (error) {
      console.error('[AUTH] Failed to send email:', error.message)
      console.log(`[AUTH] Magic link for ${email}: ${magicLinkUrl}`)
      if (process.env.NODE_ENV === 'production') {
        throw new AuthError('Failed to send magic link email', 'EMAIL_FAILED')
      }
    }
  } else {
    console.log(`[AUTH] Magic link for ${email}: ${magicLinkUrl}`)
  }

  return { success: true }
}

export async function verifyMagicLink(
  token: string,
): Promise<{ sessionToken: string; user: typeof users.$inferSelect }> {
  // Find valid token
  const tokenRecord = await db.query.magicLinkTokens.findFirst({
    where: and(
      eq(magicLinkTokens.token, token),
      gt(magicLinkTokens.expiresAt, new Date()),
      isNull(magicLinkTokens.usedAt),
    ),
  })

  if (!tokenRecord) {
    throw new AuthError('Invalid or expired magic link', 'INVALID_TOKEN')
  }

  // Mark token as used
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, tokenRecord.id))

  // Get or create user
  const user = await getOrCreateUser(tokenRecord.email)

  // Create session
  const sessionToken = await createSession(user.id)

  return { sessionToken, user }
}

export async function getOrCreateUser(email: string): Promise<typeof users.$inferSelect> {
  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  const domain = email.split('@')[1]

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        emailDomain: domain,
      })
      .returning()
    user = newUser
  }

  // Check if user is already in an organization
  const existingMembership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, user.id),
  })

  if (!existingMembership) {
    // Find organization matching user's email domain
    const org = await db.query.organizations.findFirst({
      where: sql`${domain} = ANY(${organizations.allowedDomains})`,
    })

    if (org) {
      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: user.id,
        role: 'member',
      })
    } else {
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: `${email.split('@')[0]}'s Organization`,
          slug: generateId(8),
          allowedDomains: [domain],
        })
        .returning()

      await db.insert(organizationMembers).values({
        organizationId: newOrg.id,
        userId: user.id,
        role: 'owner',
      })
    }
  }

  return user
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateId(32)
  const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days

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
