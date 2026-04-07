<!-- BEGIN:nextjs-agent-rules -->

# This Is Not The Next.js You Know

This version has breaking changes. APIs, conventions, and file structure may differ from older Next.js releases. Read the relevant guide in `node_modules/next/dist/docs/` before making framework-level changes.

<!-- END:nextjs-agent-rules -->

# Kite.dev Engineering Rules

- Use TypeScript everywhere.
- Use `pnpm` for dependency and script execution.
- Keep route handlers thin and move business logic into `src/lib/services`.
- Keep GitHub integration helpers in `src/github`.
- Keep Notion integration helpers in `src/notion`.
- Keep database clients and wiring in `src/db`.
- Keep Drizzle schema in `src/schema`.
- Use Drizzle migrations for schema changes.
- Do not log secrets, tokens, private keys, webhook signatures, or raw provider payloads.
- Prefer small, reusable services over route-level logic.
- Maintain modular boundaries so folders can be extracted later without a rewrite.
- Use British English for product copy.
- Optimise for production readiness, not demos.
- Avoid unnecessary dependencies and speculative abstractions.
- Validate environment variables with Zod and fail fast.
- Verify webhooks before processing them.
- Preserve idempotency for external event handling.

# Documentation Rules

- Treat `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CHANGELOG.md` as maintained project surface.
- Keep open-source and contributor docs in sync when setup, architecture, workflows, or review expectations change.
- Keep contribution guidance specific to Kite.dev's current repo layout and tooling.
- Do not add generic boilerplate when the repo does not support it in practice.
- Do not make legal, support, governance, or security promises that the maintainers have not actually committed to.
- Prefer concise, accurate documentation over broad or aspirational statements.
