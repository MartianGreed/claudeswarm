import { AuthService, JobService, ProjectService, TicketService } from '@claudeswarm/proto'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { getSessionCookie } from './cookies'

const API_URL = import.meta.env.VITE_API_URL || ''

function getTransport() {
  const token = getSessionCookie()

  return createConnectTransport({
    baseUrl: `${API_URL}/grpc`,
    interceptors: [
      (next) => async (req) => {
        if (token) {
          req.header.set('Authorization', `Bearer ${token}`)
        }
        return next(req)
      },
    ],
  })
}

export function getAuthClient() {
  return createClient(AuthService, getTransport())
}

export function getProjectClient() {
  return createClient(ProjectService, getTransport())
}

export function getJobClient() {
  return createClient(JobService, getTransport())
}

export function getTicketClient() {
  return createClient(TicketService, getTransport())
}
