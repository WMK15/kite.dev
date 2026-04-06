CREATE TYPE "public"."audit_actor_type" AS ENUM('system', 'user', 'github', 'notion');--> statement-breakpoint
CREATE TYPE "public"."branch_intent_status" AS ENUM('suggested', 'waiting_for_push', 'pushed', 'pull_request_opened', 'merged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."branch_type" AS ENUM('feat', 'fix', 'chore', 'docs', 'refactor', 'test');--> statement-breakpoint
CREATE TYPE "public"."pull_request_state" AS ENUM('open', 'closed', 'merged', 'draft');--> statement-breakpoint
CREATE TYPE "public"."sync_event_outcome" AS ENUM('success', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_event_type" AS ENUM('branch_intent_started', 'branch_pushed', 'pull_request_linked', 'installation_synced', 'repository_synced');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('received', 'processed', 'duplicate', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_source" AS ENUM('github', 'notion');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"branch_intent_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"database_mapping_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"notion_page_id" text NOT NULL,
	"task_identifier" text NOT NULL,
	"task_title" text NOT NULL,
	"branch_type" "branch_type" NOT NULL,
	"branch_name" text NOT NULL,
	"status" "branch_intent_status" DEFAULT 'suggested' NOT NULL,
	"latest_commit_sha" text,
	"verification_strategy" text NOT NULL,
	"suggested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pushed_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "database_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notion_workspace_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"notion_database_id" text NOT NULL,
	"title_property" text NOT NULL,
	"task_id_property" text NOT NULL,
	"suggested_branch_property" text NOT NULL,
	"git_status_property" text NOT NULL,
	"last_synced_at_property" text NOT NULL,
	"pull_request_url_property" text,
	"webhook_secret" text,
	"default_branch_type" "branch_type" DEFAULT 'feat' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "database_mappings_notion_database_id_unique" UNIQUE("notion_database_id")
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"github_installation_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"target_type" text NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_github_installation_id_unique" UNIQUE("github_installation_id")
);
--> statement-breakpoint
CREATE TABLE "notion_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"notion_workspace_id" text NOT NULL,
	"workspace_name" text NOT NULL,
	"workspace_icon" text,
	"access_token" text NOT NULL,
	"bot_id" text NOT NULL,
	"owner_notion_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notion_workspaces_notion_workspace_id_unique" UNIQUE("notion_workspace_id")
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_intent_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_pull_request_id" bigint NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"state" "pull_request_state" NOT NULL,
	"base_branch" text NOT NULL,
	"head_branch" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"merged_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_github_pull_request_id_unique" UNIQUE("github_pull_request_id")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_installation_id" uuid NOT NULL,
	"github_repository_id" bigint NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_github_repository_id_unique" UNIQUE("github_repository_id"),
	CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_delivery_id" uuid,
	"repository_id" uuid,
	"branch_intent_id" uuid,
	"source" "webhook_source" NOT NULL,
	"event_type" "sync_event_type" NOT NULL,
	"outcome" "sync_event_outcome" NOT NULL,
	"notion_page_id" text,
	"external_id" text,
	"message" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notion_user_id" text,
	"github_user_id" bigint,
	"email" text,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_notion_user_id_unique" UNIQUE("notion_user_id"),
	CONSTRAINT "users_github_user_id_unique" UNIQUE("github_user_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "webhook_source" NOT NULL,
	"delivery_id" text NOT NULL,
	"event_name" text NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"payload_hash" text NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'received' NOT NULL,
	"response_status" integer,
	"error_code" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_branch_intent_id_branch_intents_id_fk" FOREIGN KEY ("branch_intent_id") REFERENCES "public"."branch_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_intents" ADD CONSTRAINT "branch_intents_database_mapping_id_database_mappings_id_fk" FOREIGN KEY ("database_mapping_id") REFERENCES "public"."database_mappings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_intents" ADD CONSTRAINT "branch_intents_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_mappings" ADD CONSTRAINT "database_mappings_notion_workspace_id_notion_workspaces_id_fk" FOREIGN KEY ("notion_workspace_id") REFERENCES "public"."notion_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "database_mappings" ADD CONSTRAINT "database_mappings_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notion_workspaces" ADD CONSTRAINT "notion_workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_branch_intent_id_branch_intents_id_fk" FOREIGN KEY ("branch_intent_id") REFERENCES "public"."branch_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_github_installation_id_github_installations_id_fk" FOREIGN KEY ("github_installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_webhook_delivery_id_webhook_deliveries_id_fk" FOREIGN KEY ("webhook_delivery_id") REFERENCES "public"."webhook_deliveries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_branch_intent_id_branch_intents_id_fk" FOREIGN KEY ("branch_intent_id") REFERENCES "public"."branch_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_branch_intent_idx" ON "audit_events" USING btree ("branch_intent_id");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_intents_repository_branch_unique" ON "branch_intents" USING btree ("repository_id","branch_name");--> statement-breakpoint
CREATE INDEX "branch_intents_page_idx" ON "branch_intents" USING btree ("notion_page_id");--> statement-breakpoint
CREATE INDEX "branch_intents_branch_idx" ON "branch_intents" USING btree ("branch_name");--> statement-breakpoint
CREATE INDEX "branch_intents_status_idx" ON "branch_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "database_mappings_workspace_idx" ON "database_mappings" USING btree ("notion_workspace_id");--> statement-breakpoint
CREATE INDEX "database_mappings_repository_idx" ON "database_mappings" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "github_installations_user_idx" ON "github_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_installations_account_idx" ON "github_installations" USING btree ("account_login");--> statement-breakpoint
CREATE INDEX "notion_workspaces_user_idx" ON "notion_workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pull_requests_branch_intent_idx" ON "pull_requests" USING btree ("branch_intent_id");--> statement-breakpoint
CREATE INDEX "pull_requests_repository_head_idx" ON "pull_requests" USING btree ("repository_id","head_branch");--> statement-breakpoint
CREATE INDEX "repositories_installation_idx" ON "repositories" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "repositories_full_name_idx" ON "repositories" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "sync_events_branch_intent_idx" ON "sync_events" USING btree ("branch_intent_id");--> statement-breakpoint
CREATE INDEX "sync_events_page_idx" ON "sync_events" USING btree ("notion_page_id");--> statement-breakpoint
CREATE INDEX "sync_events_occurred_idx" ON "sync_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_source_delivery_unique" ON "webhook_deliveries" USING btree ("source","delivery_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries" USING btree ("event_name");