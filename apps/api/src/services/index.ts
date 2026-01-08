import type { ConnectRouter } from '@connectrpc/connect'
import authHandler from './auth-handler'
import jobHandler from './job-handler'
import projectHandler from './project-handler'
import ticketHandler from './ticket-handler'

export default (router: ConnectRouter) => {
  authHandler(router)
  jobHandler(router)
  projectHandler(router)
  ticketHandler(router)
}
