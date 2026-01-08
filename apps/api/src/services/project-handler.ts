import { create } from '@bufbuild/protobuf'
import { createDbClient, projects } from '@claudeswarm/db'
import {
  CreateProjectResponseSchema,
  DeleteProjectResponseSchema,
  GetProjectResponseSchema,
  GetProjectStatsResponseSchema,
  ListProjectsResponseSchema,
  ProjectSchema,
  ProjectService,
  ProjectStatsSchema,
  TicketProvider,
  UpdateProjectResponseSchema,
  VcsProvider,
} from '@claudeswarm/proto'
import { slugify } from '@claudeswarm/shared'
import type { ConnectRouter } from '@connectrpc/connect'
import { and, count, eq } from 'drizzle-orm'
import { env } from '../env'
import type { AuthUser } from '../middleware/auth'

const db = createDbClient(env.DATABASE_URL)

function mapVcsProvider(provider: VcsProvider): 'github' | 'gitlab' {
  switch (provider) {
    case VcsProvider.GITHUB:
      return 'github'
    case VcsProvider.GITLAB:
      return 'gitlab'
    default:
      return 'github'
  }
}

function mapTicketProvider(provider: TicketProvider): 'linear' | 'notion' | 'jira' {
  switch (provider) {
    case TicketProvider.LINEAR:
      return 'linear'
    case TicketProvider.NOTION:
      return 'notion'
    case TicketProvider.JIRA:
      return 'jira'
    default:
      return 'linear'
  }
}

function mapVcsProviderToProto(provider: string): VcsProvider {
  switch (provider) {
    case 'github':
      return VcsProvider.GITHUB
    case 'gitlab':
      return VcsProvider.GITLAB
    default:
      return VcsProvider.UNSPECIFIED
  }
}

function mapTicketProviderToProto(provider: string): TicketProvider {
  switch (provider) {
    case 'linear':
      return TicketProvider.LINEAR
    case 'notion':
      return TicketProvider.NOTION
    case 'jira':
      return TicketProvider.JIRA
    default:
      return TicketProvider.UNSPECIFIED
  }
}

function getUser(ctx: { requestHeader: Headers }): AuthUser {
  const userHeader = ctx.requestHeader.get('x-user-json')
  if (!userHeader) {
    throw new Error('Not authenticated')
  }
  return JSON.parse(userHeader) as AuthUser
}

export default (router: ConnectRouter) =>
  router.service(ProjectService, {
    async listProjects(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        return create(ListProjectsResponseSchema, { projects: [], total: 0 })
      }

      const limit = req.limit || 50
      const offset = req.offset || 0

      const results = await db.query.projects.findMany({
        where: eq(projects.organizationId, user.organizationId),
        limit,
        offset,
        orderBy: (projects, { desc }) => [desc(projects.createdAt)],
      })

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.organizationId, user.organizationId))

      return create(ListProjectsResponseSchema, {
        projects: results.map((p) =>
          create(ProjectSchema, {
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            slug: p.slug,
            repoUrl: p.repoUrl,
            defaultBranch: p.defaultBranch,
            vcsProvider: mapVcsProviderToProto(p.vcsProvider),
            ticketProvider: mapTicketProviderToProto(p.ticketProvider),
            maxConcurrentJobs: p.maxConcurrentJobs,
            isActive: p.isActive,
            claudeMdTemplate: p.claudeMdTemplate || undefined,
          }),
        ),
        total,
      })
    },

    async getProject(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, req.projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      })

      if (!project) {
        throw new Error('Project not found')
      }

      return create(GetProjectResponseSchema, {
        project: create(ProjectSchema, {
          id: project.id,
          organizationId: project.organizationId,
          name: project.name,
          slug: project.slug,
          repoUrl: project.repoUrl,
          defaultBranch: project.defaultBranch,
          vcsProvider: mapVcsProviderToProto(project.vcsProvider),
          ticketProvider: mapTicketProviderToProto(project.ticketProvider),
          maxConcurrentJobs: project.maxConcurrentJobs,
          isActive: project.isActive,
          claudeMdTemplate: project.claudeMdTemplate || undefined,
          ticketProviderConfigJson: project.ticketProviderConfig
            ? JSON.stringify(project.ticketProviderConfig)
            : undefined,
        }),
      })
    },

    async createProject(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized - no organization')
      }

      const slug = slugify(req.name)

      const [project] = await db
        .insert(projects)
        .values({
          organizationId: user.organizationId,
          name: req.name,
          slug,
          repoUrl: req.repoUrl,
          defaultBranch: req.defaultBranch || 'main',
          vcsProvider: mapVcsProvider(req.vcsProvider),
          vcsToken: req.vcsToken,
          ticketProvider: mapTicketProvider(req.ticketProvider),
          ticketProviderConfig: req.ticketProviderConfigJson
            ? JSON.parse(req.ticketProviderConfigJson)
            : {},
          ticketProviderToken: req.ticketProviderToken,
          maxConcurrentJobs: req.maxConcurrentJobs || 3,
        })
        .returning()

      return create(CreateProjectResponseSchema, {
        project: create(ProjectSchema, {
          id: project.id,
          organizationId: project.organizationId,
          name: project.name,
          slug: project.slug,
          repoUrl: project.repoUrl,
          defaultBranch: project.defaultBranch,
          vcsProvider: mapVcsProviderToProto(project.vcsProvider),
          ticketProvider: mapTicketProviderToProto(project.ticketProvider),
          maxConcurrentJobs: project.maxConcurrentJobs,
          isActive: project.isActive,
          claudeMdTemplate: project.claudeMdTemplate || undefined,
        }),
      })
    },

    async updateProject(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const updates: Partial<typeof projects.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (req.name !== undefined) updates.name = req.name
      if (req.maxConcurrentJobs !== undefined) updates.maxConcurrentJobs = req.maxConcurrentJobs
      if (req.isActive !== undefined) updates.isActive = req.isActive
      if (req.claudeMdTemplate !== undefined) updates.claudeMdTemplate = req.claudeMdTemplate
      if (req.ticketProviderConfigJson !== undefined) {
        updates.ticketProviderConfig = req.ticketProviderConfigJson
          ? JSON.parse(req.ticketProviderConfigJson)
          : {}
      }

      const [project] = await db
        .update(projects)
        .set(updates)
        .where(
          and(eq(projects.id, req.projectId), eq(projects.organizationId, user.organizationId)),
        )
        .returning()

      if (!project) {
        throw new Error('Project not found')
      }

      return create(UpdateProjectResponseSchema, {
        project: create(ProjectSchema, {
          id: project.id,
          organizationId: project.organizationId,
          name: project.name,
          slug: project.slug,
          repoUrl: project.repoUrl,
          defaultBranch: project.defaultBranch,
          vcsProvider: mapVcsProviderToProto(project.vcsProvider),
          ticketProvider: mapTicketProviderToProto(project.ticketProvider),
          maxConcurrentJobs: project.maxConcurrentJobs,
          isActive: project.isActive,
          claudeMdTemplate: project.claudeMdTemplate || undefined,
          ticketProviderConfigJson: project.ticketProviderConfig
            ? JSON.stringify(project.ticketProviderConfig)
            : undefined,
        }),
      })
    },

    async deleteProject(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      await db
        .delete(projects)
        .where(
          and(eq(projects.id, req.projectId), eq(projects.organizationId, user.organizationId)),
        )

      return create(DeleteProjectResponseSchema, { success: true })
    },

    async getProjectStats(req, ctx) {
      const user = getUser(ctx)
      if (!user.organizationId) {
        throw new Error('Not authorized')
      }

      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, req.projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      })

      if (!project) {
        throw new Error('Project not found')
      }

      // TODO: Calculate actual stats from jobs table
      return create(GetProjectStatsResponseSchema, {
        stats: create(ProjectStatsSchema, {
          projectId: project.id,
          projectName: project.name,
          activeJobs: 0,
          maxConcurrentJobs: project.maxConcurrentJobs,
          pendingJobs: 0,
          completedToday: 0,
          failedToday: 0,
          needsClarification: 0,
        }),
      })
    },
  })
