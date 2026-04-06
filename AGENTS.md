<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Kite Engineering Rules

- Use TypeScript everywhere.
- Use `pnpm` for dependency and script execution.
- Keep route handlers thin and move business logic into `src/lib/services`.
- Do not log secrets, tokens, private keys, or raw webhook payloads.
- Prefer small, reusable services over route-level logic.
- Maintain modular boundaries so folders can be extracted later without a rewrite.
- Update `README.md` and `CHANGELOG.md` when behaviour or setup changes.
- Use British English for product copy.
- Optimise for production readiness, not demos.
- Avoid unnecessary dependencies and speculative abstractions.
- Validate environment variables with Zod and fail fast.
- Verify webhooks before processing them.
- Preserve idempotency for external event handling.
