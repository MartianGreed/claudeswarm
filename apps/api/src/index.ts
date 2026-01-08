import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { createDbClient, organizationMembers, sessions } from '@claudeswarm/db'
import { connectNodeAdapter } from '@connectrpc/connect-node'
import { and, eq, gt } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env'
import { type AuthUser, authMiddleware } from './middleware/auth'
import { recoverOrphanedJobs, startQueue, stopQueue } from './queue'
import { healthRoutes } from './routes/health'
import routes from './services'

console.log(env)
const db = createDbClient(env.DATABASE_URL)

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Connect-Protocol-Version',
  'Connect-Accept-Encoding',
  'Connect-Content-Encoding',
  'Connect-Timeout-Ms',
  'Grpc-Accept-Encoding',
  'Grpc-Timeout',
].join(', ')

const EXPOSED_HEADERS = [
  'Grpc-Status',
  'Grpc-Message',
  'Grpc-Status-Details-Bin',
  'Connect-Content-Encoding',
].join(', ')

// Hono app for non-gRPC routes
const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    allowHeaders: ALLOWED_HEADERS.split(', '),
    exposeHeaders: EXPOSED_HEADERS.split(', '),
  }),
)
app.use('*', authMiddleware)

app.route('/health', healthRoutes)

async function resolveUser(authHeader: string | undefined): Promise<AuthUser | null> {
  const sessionToken = authHeader?.replace('Bearer ', '')
  if (!sessionToken) return null

  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionToken), gt(sessions.expiresAt, new Date())),
    with: { user: true },
  })
  if (!session) return null

  const orgMember = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  })

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: orgMember?.organizationId || null,
  }
}

// Connect-RPC handler for gRPC routes
const connectHandler = connectNodeAdapter({
  routes,
  interceptors: [
    (next) => async (req) => {
      try {
        const user = await resolveUser(req.header.get('Authorization') ?? undefined)
        if (user) {
          req.header.set('x-user-json', JSON.stringify(user))
        }
        return await next(req)
      } catch (err) {
        console.error('[gRPC Error]', err)
        throw err
      }
    },
  ],
})

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin
  if (origin && env.CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (env.CORS_ORIGINS.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGINS[0])
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
  res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.setHeader('Vary', 'Origin')
}

// Raw Node.js HTTP server that routes between Hono and Connect-RPC
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || ''

  // Handle gRPC routes with Connect-RPC
  if (url.startsWith('/grpc/')) {
    setCorsHeaders(req, res)

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Strip /grpc prefix for Connect-RPC
    req.url = url.replace('/grpc', '')
    connectHandler(req, res)
    return
  }

  // Handle all other routes with Hono
  try {
    const honoReq = new Request(`http://${req.headers.host || 'localhost'}${url}`, {
      method: req.method,
      headers: Object.entries(req.headers).reduce(
        (acc, [k, v]) => {
          if (v) acc[k] = Array.isArray(v) ? v.join(', ') : v
          return acc
        },
        {} as Record<string, string>,
      ),
      body: ['GET', 'HEAD'].includes(req.method || '') ? null : (req as unknown as ReadableStream),
      duplex: 'half',
    })

    const honoRes = await app.fetch(honoReq)

    res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers.entries()))
    if (honoRes.body) {
      const reader = honoRes.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (err) {
    console.error('Hono error:', err)
    res.writeHead(500)
    res.end('Internal Server Error')
  }
})

async function main() {
  console.log(`Starting API server on ${env.HOST}:${env.PORT}`)

  await startQueue()
  await recoverOrphanedJobs(db)

  server.listen(env.PORT, env.HOST, () => {
    console.log(`Server listening on http://${env.HOST}:${env.PORT}`)
  })

  process.on('SIGTERM', async () => {
    console.log('Shutting down API server...')
    await stopQueue()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('Shutting down API server...')
    await stopQueue()
    process.exit(0)
  })
}

main().catch(console.error)
