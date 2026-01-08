import { create } from '@bufbuild/protobuf'
import {
  AuthService,
  GetCurrentUserResponseSchema,
  LogoutResponseSchema,
  SendMagicLinkResponseSchema,
  UserSchema,
  VerifyMagicLinkResponseSchema,
} from '@claudeswarm/proto'
import type { ConnectRouter } from '@connectrpc/connect'
import type { AuthUser } from '../middleware/auth'
import { deleteSession, sendMagicLink, verifyMagicLink } from './auth'

export default (router: ConnectRouter) =>
  router.service(AuthService, {
    async sendMagicLink(req) {
      const result = await sendMagicLink(req.email)
      return create(SendMagicLinkResponseSchema, { success: result.success })
    },

    async verifyMagicLink(req) {
      const result = await verifyMagicLink(req.token)
      return create(VerifyMagicLinkResponseSchema, {
        sessionToken: result.sessionToken,
        user: create(UserSchema, {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? undefined,
          avatarUrl: result.user.avatarUrl ?? undefined,
        }),
      })
    },

    async getCurrentUser(_req, ctx) {
      const userJson = ctx.requestHeader.get('x-user-json')
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null
      if (!user) {
        throw new Error('Not authenticated')
      }
      return create(GetCurrentUserResponseSchema, {
        user: create(UserSchema, {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        }),
      })
    },

    async logout(_req, ctx) {
      const authHeader = ctx.requestHeader.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        await deleteSession(token)
      }
      return create(LogoutResponseSchema, { success: true })
    },
  })
