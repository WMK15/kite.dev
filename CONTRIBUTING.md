# Contributing to Kite.dev

Kite.dev is an open-source product, not a demo repo. Contributions should make the codebase clearer, safer, and more useful.

## Before You Start

Read `README.md` first for the product overview and setup. If you are making a behavioural or workflow change, plan to update the relevant docs in the same pull request.

## Local Setup

1. Install Node.js 20 or newer.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env.local`.
4. Fill in the required environment variables.
5. Apply migrations with `pnpm db:migrate`.
6. Start the app with `pnpm dev`.

Useful commands:

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm db:generate`
- `pnpm db:migrate`

## Working Style

Prefer focused changes.

- Keep logic explicit.
- Avoid speculative abstractions.
- Avoid unnecessary dependencies.
- Remove dead code rather than leaving it around.
- Keep docs in sync with the code when workflows or behaviour change.

## Repository Structure

Kite.dev is a single-repo Next.js App Router application.

- Keep route handlers thin. They should handle HTTP concerns and delegate quickly.
- Put business logic in `src/lib/services`.
- Keep GitHub integration helpers in `src/github`.
- Keep Notion integration helpers in `src/notion`.
- Keep database clients and wiring in `src/db`.
- Keep Drizzle schema in `src/schema`.
- Use Drizzle migrations for schema changes. Do not rely on schema drift.

If you move or reshape these boundaries, update the contributor-facing docs as part of the same change.

## Engineering Standards

- Use TypeScript everywhere.
- Write modular, production-minded code.
- Use British English in product-facing copy.
- Do not log secrets, tokens, webhook signatures, private keys, or raw provider payloads.
- Keep names clear and consistent.
- Prefer small, reusable services over route-level logic.
- Keep validation and verification close to integration boundaries.

## Branch Naming

Use the project branch format:

- `type/TASK-ID-slug`

Examples:

- `feat/KITE-142-sync-notion-status`
- `fix/KITE-201-pr-linking-bug`

Supported branch types in the repo today:

- `feat`
- `fix`
- `chore`
- `docs`
- `refactor`
- `test`

## Testing and Verification

Every non-trivial change should come with the right verification.

- Add or update unit tests for important pure logic.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before opening a pull request.
- Run `pnpm build` when you change routing, framework wiring, configuration, or rendering behaviour.
- If a change affects integrations, note any manual verification you performed.

## Pull Requests

Keep pull requests easy to review.

Before opening one:

1. Make sure the branch name follows the project convention.
2. Keep the change focused.
3. Include migrations, tests, and docs where relevant.
4. Check that no secrets or credentials appear in the diff.

In the pull request description, include:

- the problem being solved
- the approach taken
- any schema or environment changes
- any security-sensitive behaviour worth calling out
- manual verification notes when needed

Only add screenshots when they help explain a UI change, and check them for secrets before uploading.

## Reporting Bugs

Good bug reports make it easier to act quickly.

Please include:

- expected behaviour
- actual behaviour
- reproduction steps
- relevant environment details
- redacted logs or screenshots if they help

Do not use public GitHub issues for security vulnerabilities. Follow `SECURITY.md` instead.
