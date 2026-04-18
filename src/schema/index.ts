import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const branchTypeEnum = pgEnum("branch_type", [
  "feat",
  "fix",
  "chore",
  "docs",
  "refactor",
  "test",
]);

export const branchIntentStatusEnum = pgEnum("branch_intent_status", [
  "suggested",
  "waiting_for_push",
  "pushed",
  "pull_request_opened",
  "merged",
  "closed",
]);

export const webhookSourceEnum = pgEnum("webhook_source", ["github", "notion"]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "received",
  "processed",
  "duplicate",
  "ignored",
  "failed",
]);

export const syncEventTypeEnum = pgEnum("sync_event_type", [
  "branch_intent_started",
  "branch_pushed",
  "pull_request_linked",
  "installation_synced",
  "repository_synced",
]);

export const syncEventOutcomeEnum = pgEnum("sync_event_outcome", [
  "success",
  "ignored",
  "failed",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "system",
  "user",
  "github",
  "notion",
]);

export const pullRequestStateEnum = pgEnum("pull_request_state", [
  "open",
  "closed",
  "merged",
  "draft",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notionUserId: text("notion_user_id").unique(),
    githubUserId: bigint("github_user_id", { mode: "number" }).unique(),
    email: text("email"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("users_email_idx").on(table.email)],
);

export const notionWorkspaces = pgTable(
  "notion_workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notionWorkspaceId: text("notion_workspace_id").notNull().unique(),
    workspaceName: text("workspace_name").notNull(),
    workspaceIcon: text("workspace_icon"),
    accessToken: text("access_token").notNull(),
    botId: text("bot_id").notNull(),
    ownerNotionUserId: text("owner_notion_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("notion_workspaces_user_idx").on(table.userId)],
);

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    githubInstallationId: bigint("github_installation_id", { mode: "number" })
      .notNull()
      .unique(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    accountLogin: text("account_login").notNull(),
    accountType: text("account_type").notNull(),
    targetType: text("target_type").notNull(),
    permissions: jsonb("permissions")
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    installedAt: timestamp("installed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("github_installations_user_idx").on(table.userId),
    index("github_installations_account_idx").on(table.accountLogin),
  ],
);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubInstallationId: uuid("github_installation_id")
      .references(() => githubInstallations.id, { onDelete: "cascade" })
      .notNull(),
    githubRepositoryId: bigint("github_repository_id", { mode: "number" })
      .notNull()
      .unique(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull().unique(),
    defaultBranch: text("default_branch").notNull(),
    isPrivate: boolean("is_private").default(true).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("repositories_installation_idx").on(table.githubInstallationId),
    index("repositories_full_name_idx").on(table.fullName),
  ],
);

export const databaseMappings = pgTable(
  "database_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notionWorkspaceId: uuid("notion_workspace_id")
      .references(() => notionWorkspaces.id, { onDelete: "cascade" })
      .notNull(),
    repositoryId: uuid("repository_id")
      .references(() => repositories.id, { onDelete: "cascade" })
      .notNull(),
    notionDatabaseId: text("notion_database_id").notNull().unique(),
    notionDatabaseName: text("notion_database_name").notNull(),
    titleProperty: text("title_property").notNull(),
    taskIdProperty: text("task_id_property").notNull(),
    suggestedBranchProperty: text("suggested_branch_property").notNull(),
    gitStatusProperty: text("git_status_property").notNull(),
    lastSyncedAtProperty: text("last_synced_at_property").notNull(),
    pullRequestUrlProperty: text("pull_request_url_property"),
    webhookSecret: text("webhook_secret"),
    defaultBranchType: branchTypeEnum("default_branch_type")
      .default("feat")
      .notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("database_mappings_workspace_idx").on(table.notionWorkspaceId),
    index("database_mappings_repository_idx").on(table.repositoryId),
  ],
);

export const branchIntents = pgTable(
  "branch_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    databaseMappingId: uuid("database_mapping_id")
      .references(() => databaseMappings.id, { onDelete: "cascade" })
      .notNull(),
    repositoryId: uuid("repository_id")
      .references(() => repositories.id, { onDelete: "cascade" })
      .notNull(),
    notionPageId: text("notion_page_id").notNull(),
    taskIdentifier: text("task_identifier").notNull(),
    taskTitle: text("task_title").notNull(),
    branchType: branchTypeEnum("branch_type").notNull(),
    branchName: text("branch_name").notNull(),
    status: branchIntentStatusEnum("status").default("suggested").notNull(),
    latestCommitSha: text("latest_commit_sha"),
    verificationStrategy: text("verification_strategy").notNull(),
    suggestedAt: timestamp("suggested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("branch_intents_repository_branch_unique").on(
      table.repositoryId,
      table.branchName,
    ),
    index("branch_intents_page_idx").on(table.notionPageId),
    index("branch_intents_branch_idx").on(table.branchName),
    index("branch_intents_status_idx").on(table.status),
  ],
);

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchIntentId: uuid("branch_intent_id")
      .references(() => branchIntents.id, { onDelete: "cascade" })
      .notNull(),
    repositoryId: uuid("repository_id")
      .references(() => repositories.id, { onDelete: "cascade" })
      .notNull(),
    githubPullRequestId: bigint("github_pull_request_id", { mode: "number" })
      .notNull()
      .unique(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    state: pullRequestStateEnum("state").notNull(),
    baseBranch: text("base_branch").notNull(),
    headBranch: text("head_branch").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pull_requests_branch_intent_idx").on(table.branchIntentId),
    index("pull_requests_repository_head_idx").on(
      table.repositoryId,
      table.headBranch,
    ),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: webhookSourceEnum("source").notNull(),
    deliveryId: text("delivery_id").notNull(),
    eventName: text("event_name").notNull(),
    signatureVerified: boolean("signature_verified").default(false).notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: webhookDeliveryStatusEnum("status").default("received").notNull(),
    responseStatus: integer("response_status"),
    errorCode: text("error_code"),
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("webhook_deliveries_source_delivery_unique").on(
      table.source,
      table.deliveryId,
    ),
    index("webhook_deliveries_event_idx").on(table.eventName),
  ],
);

export const syncEvents = pgTable(
  "sync_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    webhookDeliveryId: uuid("webhook_delivery_id").references(
      () => webhookDeliveries.id,
      {
        onDelete: "set null",
      },
    ),
    repositoryId: uuid("repository_id").references(() => repositories.id, {
      onDelete: "set null",
    }),
    branchIntentId: uuid("branch_intent_id").references(
      () => branchIntents.id,
      {
        onDelete: "set null",
      },
    ),
    source: webhookSourceEnum("source").notNull(),
    eventType: syncEventTypeEnum("event_type").notNull(),
    outcome: syncEventOutcomeEnum("outcome").notNull(),
    notionPageId: text("notion_page_id"),
    externalId: text("external_id"),
    message: text("message").notNull(),
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("sync_events_branch_intent_idx").on(table.branchIntentId),
    index("sync_events_page_idx").on(table.notionPageId),
    index("sync_events_occurred_idx").on(table.occurredAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id").references(() => repositories.id, {
      onDelete: "set null",
    }),
    branchIntentId: uuid("branch_intent_id").references(
      () => branchIntents.id,
      {
        onDelete: "set null",
      },
    ),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("audit_events_branch_intent_idx").on(table.branchIntentId),
    index("audit_events_occurred_idx").on(table.occurredAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  notionWorkspaces: many(notionWorkspaces),
  githubInstallations: many(githubInstallations),
}));

export const notionWorkspacesRelations = relations(
  notionWorkspaces,
  ({ one, many }) => ({
    user: one(users, {
      fields: [notionWorkspaces.userId],
      references: [users.id],
    }),
    databaseMappings: many(databaseMappings),
  }),
);

export const githubInstallationsRelations = relations(
  githubInstallations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [githubInstallations.userId],
      references: [users.id],
    }),
    repositories: many(repositories),
  }),
);

export const repositoriesRelations = relations(
  repositories,
  ({ one, many }) => ({
    githubInstallation: one(githubInstallations, {
      fields: [repositories.githubInstallationId],
      references: [githubInstallations.id],
    }),
    databaseMappings: many(databaseMappings),
    branchIntents: many(branchIntents),
    pullRequests: many(pullRequests),
  }),
);

export const databaseMappingsRelations = relations(
  databaseMappings,
  ({ one, many }) => ({
    notionWorkspace: one(notionWorkspaces, {
      fields: [databaseMappings.notionWorkspaceId],
      references: [notionWorkspaces.id],
    }),
    repository: one(repositories, {
      fields: [databaseMappings.repositoryId],
      references: [repositories.id],
    }),
    branchIntents: many(branchIntents),
  }),
);

export const branchIntentsRelations = relations(
  branchIntents,
  ({ one, many }) => ({
    databaseMapping: one(databaseMappings, {
      fields: [branchIntents.databaseMappingId],
      references: [databaseMappings.id],
    }),
    repository: one(repositories, {
      fields: [branchIntents.repositoryId],
      references: [repositories.id],
    }),
    pullRequests: many(pullRequests),
    syncEvents: many(syncEvents),
    auditEvents: many(auditEvents),
  }),
);

export const pullRequestsRelations = relations(pullRequests, ({ one }) => ({
  branchIntent: one(branchIntents, {
    fields: [pullRequests.branchIntentId],
    references: [branchIntents.id],
  }),
  repository: one(repositories, {
    fields: [pullRequests.repositoryId],
    references: [repositories.id],
  }),
}));

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ many }) => ({
    syncEvents: many(syncEvents),
  }),
);

export const syncEventsRelations = relations(syncEvents, ({ one }) => ({
  webhookDelivery: one(webhookDeliveries, {
    fields: [syncEvents.webhookDeliveryId],
    references: [webhookDeliveries.id],
  }),
  repository: one(repositories, {
    fields: [syncEvents.repositoryId],
    references: [repositories.id],
  }),
  branchIntent: one(branchIntents, {
    fields: [syncEvents.branchIntentId],
    references: [branchIntents.id],
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  repository: one(repositories, {
    fields: [auditEvents.repositoryId],
    references: [repositories.id],
  }),
  branchIntent: one(branchIntents, {
    fields: [auditEvents.branchIntentId],
    references: [branchIntents.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NotionWorkspace = typeof notionWorkspaces.$inferSelect;
export type GitHubInstallation = typeof githubInstallations.$inferSelect;
export type Repository = typeof repositories.$inferSelect;
export type DatabaseMapping = typeof databaseMappings.$inferSelect;
export type BranchIntent = typeof branchIntents.$inferSelect;
export type PullRequest = typeof pullRequests.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type SyncEvent = typeof syncEvents.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
