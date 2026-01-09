import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'waiting_dependency',
  'running',
  'needs_clarification',
  'needs_permission',
  'pr_created',
  'completed',
  'failed',
  'cancelled',
])

export const ticketProviderEnum = pgEnum('ticket_provider', ['linear', 'notion', 'jira'])

export const vcsProviderEnum = pgEnum('vcs_provider', ['github', 'gitlab'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  emailDomain: text('email_domain').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
  sessions: many(sessions),
}))

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  allowedDomains: text('allowed_domains').array().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
}))

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('org_user_unique').on(table.organizationId, table.userId)],
)

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}))

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),

    repoUrl: text('repo_url').notNull(),
    defaultBranch: text('default_branch').notNull().default('main'),
    vcsProvider: vcsProviderEnum('vcs_provider').notNull(),
    vcsToken: text('vcs_token').notNull(),

    ticketProvider: ticketProviderEnum('ticket_provider').notNull(),
    ticketProviderConfig: jsonb('ticket_provider_config')
      .notNull()
      .$type<Record<string, unknown>>(),
    ticketProviderToken: text('ticket_provider_token').notNull(),

    maxConcurrentJobs: integer('max_concurrent_jobs').notNull().default(3),
    sandboxBasePath: text('sandbox_base_path').notNull().default('/tmp/claudeswarm/sandboxes'),
    claudeMdTemplate: text('claude_md_template'),
    claudePermissionsConfig: jsonb('claude_permissions_config')
      .$type<{ allow: string[] }>()
      .notNull()
      .default({
        allow: [
          'Bash(gh:*)',
          'Bash(jj:*)',
          'Bash(git:*)',
          'Bash(bun:*)',
          'Bash(npm:*)',
          'Bash(npx:*)',
          'Bash(pnpm:*)',
          'Bash(yarn:*)',
          'Bash(node:*)',
          'Bash(deno:*)',
          'Bash(cargo:*)',
          'Bash(python:*)',
          'Bash(python3:*)',
          'Bash(pip:*)',
          'Bash(pip3:*)',
          'Bash(poetry:*)',
          'Bash(uv:*)',
          'Bash(make:*)',
          'Bash(cmake:*)',
          'Bash(cat:*)',
          'Bash(ls:*)',
          'Bash(head:*)',
          'Bash(tail:*)',
          'Bash(grep:*)',
          'Bash(find:*)',
          'Bash(wc:*)',
          'Bash(sort:*)',
          'Bash(uniq:*)',
          'Bash(cut:*)',
          'Bash(tr:*)',
          'Bash(awk:*)',
          'Bash(sed:*)',
          'Bash(xargs:*)',
          'Bash(tee:*)',
          'Bash(diff:*)',
          'Bash(comm:*)',
          'Bash(pwd:*)',
          'Bash(which:*)',
          'Bash(whereis:*)',
          'Bash(echo:*)',
          'Bash(printf:*)',
          'Bash(date:*)',
          'Bash(env:*)',
          'Bash(dirname:*)',
          'Bash(basename:*)',
          'Bash(realpath:*)',
          'Bash(stat:*)',
          'Bash(file:*)',
          'Bash(test:*)',
          'Bash(true:*)',
          'Bash(false:*)',
          'Bash(mkdir:*)',
          'Bash(touch:*)',
          'Bash(cp:*)',
          'Bash(mv:*)',
          'Bash(rm:*)',
          'Bash(ln:*)',
          'Bash(chmod:*)',
          'Bash(tar:*)',
          'Bash(gzip:*)',
          'Bash(gunzip:*)',
          'Bash(zip:*)',
          'Bash(unzip:*)',
          'Bash(curl:*)',
          'Bash(wget:*)',
          'Read',
          'Write',
          'Edit',
          'Glob',
          'Grep',
          'WebFetch',
          'WebSearch',
        ],
      }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('org_project_slug_unique').on(table.organizationId, table.slug)],
)

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  tickets: many(tickets),
  jobs: many(jobs),
}))

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

    externalId: text('external_id').notNull(),
    externalUrl: text('external_url').notNull(),

    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority'),
    labels: text('labels').array(),
    dependsOn: text('depends_on').array(),
    externalStatus: text('external_status'),
    comments:
      jsonb('comments').$type<Array<{ body: string; createdAt: string; author: string | null }>>(),

    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    externalUpdatedAt: timestamp('external_updated_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('project_external_id_unique').on(table.projectId, table.externalId)],
)

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  jobs: many(jobs),
}))

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),

    status: jobStatusEnum('status').notNull().default('pending'),

    iteration: integer('iteration').notNull().default(0),
    maxIterations: integer('max_iterations').notNull().default(100),
    completionPromise: text('completion_promise').default('TASK COMPLETE'),

    sandboxPath: text('sandbox_path'),
    branchName: text('branch_name'),

    prUrl: text('pr_url'),
    prNumber: integer('pr_number'),

    blockedByJobId: uuid('blocked_by_job_id'),

    errorMessage: text('error_message'),
    errorStack: text('error_stack'),

    workerId: text('worker_id'),

    clarificationQuestion: text('clarification_question'),
    clarificationAnswer: text('clarification_answer'),

    pendingPermissionRequest: text('pending_permission_request'),

    finalOutput: text('final_output'),

    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('job_ticket_active_unique')
      .on(table.ticketId)
      .where(sql`status NOT IN ('completed', 'pr_created', 'failed', 'cancelled')`),
  ],
)

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  project: one(projects, {
    fields: [jobs.projectId],
    references: [projects.id],
  }),
  ticket: one(tickets, {
    fields: [jobs.ticketId],
    references: [tickets.id],
  }),
  blockedByJob: one(jobs, {
    fields: [jobs.blockedByJobId],
    references: [jobs.id],
    relationName: 'blockedBy',
  }),
  logs: many(jobLogs),
}))

export const jobLogs = pgTable('job_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .references(() => jobs.id, { onDelete: 'cascade' })
    .notNull(),

  iteration: integer('iteration').notNull(),
  eventType: text('event_type').notNull(),
  eventData: jsonb('event_data').$type<Record<string, unknown>>(),
  claudeOutput: text('claude_output'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [jobLogs.jobId],
    references: [jobs.id],
  }),
}))

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type JobLog = typeof jobLogs.$inferSelect
export type NewJobLog = typeof jobLogs.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert
export type JobStatus = (typeof jobStatusEnum.enumValues)[number]
export type TicketProvider = (typeof ticketProviderEnum.enumValues)[number]
export type VcsProvider = (typeof vcsProviderEnum.enumValues)[number]
