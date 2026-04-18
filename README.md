# Kite.dev

![Kite.dev logo](./public/brand/wordmark-on-background.png)

**Kite.dev connects Notion tasks to GitHub branch and pull request activity.**

Kite.dev is an open-source bridge for teams that plan work in Notion but ship code in GitHub. It helps keep the task and the code path connected without asking the team to move to a different tracker.

Kite.dev is currently early-stage. The core loop is in place, but the product and schema will continue to evolve as the workflow is tightened.

## How It Works

1. A user starts work from a task in Notion.
2. Kite.dev generates a deterministic branch name.
3. The user creates that branch locally and pushes it.
4. GitHub App webhooks tell Kite.dev when the branch appears remotely.
5. Kite.dev updates the Notion task automatically.
6. When a pull request is opened later, Kite.dev can link it back to the task.

Kite.dev does not create branches on GitHub and does not try to infer local-only work. It is designed around remote events that can be verified and tracked reliably.

## Why Kite.dev Exists

Many teams use Notion for planning, backlog management, and task tracking, while the actual code workflow lives in GitHub. That split is common, but it often leaves the task disconnected from what is happening in the repository.

Kite.dev closes that gap. It gives teams a lightweight link between the task in Notion and the branch or pull request in GitHub, without requiring them to adopt a different project management tool.

## Current Features

- Notion-triggered branch suggestion flow
- Deterministic branch naming using the project branch format
- GitHub push detection via GitHub App webhooks
- Automatic Notion task updates when a tracked branch is pushed
- Pull request linking foundation through GitHub pull request webhooks
- Idempotent webhook delivery tracking
- Structured, sanitised logging with Sentry and PostHog hooks

## Architecture

Kite.dev is a single-repo Next.js App Router application with a separate services layer for business logic.

- `src/app`: pages and route handlers
- `src/lib/services`: orchestration and business logic
- `src/github`: GitHub App and OAuth helpers
- `src/notion`: Notion client and property helpers
- `src/db`: database clients and wiring
- `src/schema`: Drizzle schema and relations
- `src/security`: verification and sanitisation helpers
- `src/observability`: logging, Sentry, and PostHog
- `tests`: unit tests for important pure logic

Route handlers are intentionally thin. Verification, idempotency, branch matching, repository syncing, and Notion updates live in reusable services.

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
- Vercel-friendly deployment model

## Local Development

### Clone and Install

```bash
git clone https://github.com/WMK15/kite.dev.git
cd kite
pnpm install
```

### Environment Setup

Copy the example file and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables are listed in `.env.example`. The app validates them at startup and fails fast if they are missing.

### Database Setup

Apply the current Drizzle migrations:

```bash
pnpm db:migrate
```

If you change the schema later, generate a new migration with:

```bash
pnpm db:generate
```

### Run the App

```bash
pnpm dev
```

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## GitHub App Setup

Kite.dev uses a GitHub App, not a standalone OAuth App.

Recommended repository permissions:

- Metadata: read-only
- Contents: read-only
- Pull requests: read-only

Subscribe the app to these webhook events:

- `push`
- `pull_request`
- `installation`
- `installation_repositories`

Set the webhook URL to:

- `/api/github/webhooks`

Set the callback URL to:

- `/api/auth/github/callback`

Kite.dev stores installation and repository metadata from these webhook payloads so repository mappings can stay aligned with GitHub App state.

For the MVP, the two routes have different jobs:

- `/api/github/webhooks`: receives signed push, pull request, and installation events from GitHub
- `/api/auth/github/callback`: handles browser redirects after GitHub App installation or setup

## Notion Integration Setup

1. Create a public Notion integration.
2. Set the redirect URI to `/api/auth/notion/callback`.
3. Share the relevant task database with the integration.
4. Configure a database mapping in Kite.dev so the right task properties are updated.
5. Point the Notion button or webhook action at `/api/notion/webhook/start-branch`.

## Security Notes

- GitHub webhooks use HMAC SHA-256 verification.
- Notion start-branch requests support a per-mapping shared secret when configured.
- Notion delivery tracking uses an explicit delivery header when available, with a payload hash fallback for idempotency.
- Structured logs are sanitised and must not contain secrets or tokens.

Further hardening is still to come in a few areas:

- encryption at rest for provider tokens
- authenticated dashboard access and role-based permissions
- fuller OAuth state and anti-CSRF initiation flows

## Open Source

Kite.dev is released under the MIT licence.

Project and community docs:

- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

If you plan to contribute, start with `CONTRIBUTING.md` for project structure, engineering standards, and pull request expectations.

## Project Status

Kite.dev is still early-stage.

- the core Notion to branch to webhook loop is the current focus
- APIs, schema details, and setup ergonomics may change as the product matures
- feedback and contributions are useful, especially when they stay close to the current product direction

## Author

Kite.dev was created by [@wmk.universe](https://instagram.com/wmk.universe) and [W-15 Interactive](https://w15interactive.com), a story-driven digital experiences company.
