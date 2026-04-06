# Kite.dev

![Kite.dev wordmark](./public/brand/wordmark-on-background.png)

Kite.dev is a production-minded bridge between Notion and GitHub.

The MVP focuses on one core loop:

1. A user clicks a Notion button inside a task.
2. Kite.dev suggests a deterministic branch name.
3. The user creates and pushes that branch locally.
4. Kite.dev receives the GitHub App webhook.
5. Kite.dev updates the Notion task and later links any pull request.

## Architecture

- `src/app`: App Router pages and thin route handlers
- `src/lib/services`: business logic and orchestration
- `src/schema`: Drizzle schema and relations
- `src/db`: database client wiring
- `src/github`: GitHub App and OAuth helpers
- `src/notion`: Notion client and property helpers
- `src/security`: webhook verification and sanitisation helpers
- `src/observability`: structured logging, Sentry, and PostHog
- `tests`: unit coverage for branch naming, webhook verification, and branch matching

Route handlers only deal with HTTP transport. Verification, idempotency, branch matching, repository syncing, and Notion updates all live in reusable service functions.

GitHub webhook dispatch covers `push`, `pull_request`, `installation`, and `installation_repositories` so Kite.dev can keep repository records in sync with GitHub App installation state.

## Stack

- Next.js 16 App Router
- TypeScript in strict mode
- Tailwind CSS v4
- shadcn/ui-style component primitives
- Supabase Postgres
- Drizzle ORM with migrations
- GitHub App integration
- Notion public integration
- Sentry
- PostHog

## Local Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and fill every required value.
3. Generate migrations if you change the schema with `pnpm db:generate`.
4. Apply migrations with `pnpm db:migrate`.
5. Start the app with `pnpm dev`.

## Required Environment Variables

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_APP_ID`
- `GITHUB_APP_NAME`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

## GitHub App Setup

Use a GitHub App, not an OAuth App on its own.

Recommended repository permissions:

- Metadata: read-only
- Contents: read-only
- Pull requests: read-only

Subscribe to these webhook events:

- `push`
- `pull_request`
- `installation`
- `installation_repositories`

Point the webhook URL at `/api/github/webhooks`.

The current implementation stores installation and repository metadata from webhook payloads so Kite.dev can keep repository mappings aligned with GitHub App state without over-scoping permissions.

## Notion Setup

1. Create a public Notion integration.
2. Set the redirect URI to `/api/auth/notion/callback`.
3. Share the relevant task database with the integration.
4. Configure a database mapping in Kite.dev so the app knows which Notion properties map to branch state.
5. Point the Notion button or webhook action at `/api/notion/webhook/start-branch`.

## Security Notes

- GitHub webhooks use HMAC SHA-256 verification.
- Notion start-branch requests support a per-mapping shared secret when configured, then fall back to best-effort verification by checking the linked workspace and page.
- Webhook deliveries are idempotent by delivery ID.
- Notion start-branch requests are stored in `webhook_deliveries` too, using an explicit delivery header when present and a payload hash fallback otherwise.
- Structured logs are sanitised to avoid leaking secrets or tokens.
- Environment validation fails fast at startup.

Further hardening that is intentionally deferred:

- encrypting provider access tokens at rest with managed key infrastructure
- authenticated dashboard access and role-based permissions
- replay-window enforcement for Notion-originating calls beyond per-mapping secrets
- full OAuth state management and anti-CSRF initiation flows for the integration connect UI

## Development Commands

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:generate`
- `pnpm db:migrate`

## Deployment

The app is designed for Vercel-compatible deployment and expects Node runtime route handlers for all integration endpoints.

## Supabase Notes

The project uses Supabase Postgres as the database and includes server/admin client helpers under `src/db/supabase` for future authenticated dashboard work without mixing transport logic into route handlers.
