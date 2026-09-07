<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Database Guidelines

- **NEVER use `db:migrate` or `drizzle-kit migrate`**: Do not use migration files or commands.
- **Always prefer `db:push` (`drizzle-kit push`)**: This project is in active development, and there is no need for backwards compatibility or migration history.
- Database files are located under `src/lib/db/`.
