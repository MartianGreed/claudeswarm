import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env'
import { authMiddleware } from './middleware/auth'
import { healthRoutes } from './routes/health'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }),
)
app.use('*', authMiddleware)

app.route('/health', healthRoutes)

// TODO: Add Connect-ES gRPC routes when proto is generated
// import { connectNodeAdapter } from '@connectrpc/connect-node'
// import { routes } from './services'
// app.all('/grpc/*', connectNodeAdapter({ routes }))

console.log(`Starting API server on ${env.HOST}:${env.PORT}`)

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
}
