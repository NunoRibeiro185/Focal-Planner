# Focal

Multi-tenant SaaS for wedding & portrait photographers — packages/pricing,
bookings, scheduling, finances, inquiries, client collaboration, and
post-production tracking. Next.js 16 (App Router) · Supabase · Tailwind v4 ·
Vitest. See [`CLAUDE.md`](./CLAUDE.md) for architecture and `.impeccable.md` for
design intent.

## Quick start — Dev Container (recommended)

A fully self-contained environment: Node 22, the Supabase CLI, and a **local
Supabase stack** seeded with demo data. It never touches the production
database.

**Prerequisites:** Docker Desktop running, and the
[Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
in Cursor/VS Code.

1. Open the project in Cursor → **Reopen in Container**.
2. Wait for `postCreate` to finish — it installs deps, starts Supabase, applies
   migrations + seed, and writes `.env.local` for you (first run pulls images,
   so give it a few minutes).
3. `npm run dev` → open **http://localhost:3000** (already "logged in" as the
   seeded photographer via `DEV_BYPASS_AUTH`).

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| Supabase Studio | http://localhost:54323 |
| Inbucket (captured emails) | http://localhost:54324 |

Reset the database back to the seed at any time: `npm run db:reset`.

## How the local stack is wired

- The browser reaches Supabase at `localhost:54321`; the in-container Next.js
  server reaches it via `host.docker.internal:54321` (`SUPABASE_INTERNAL_URL`).
- `DEV_BYPASS_AUTH=true` skips Google OAuth — `src/lib/supabase/server.ts`
  resolves the seeded dev photographer and uses the service-role key locally so
  RLS-scoped data is visible without a real session.
- External services (Resend, LemonSqueezy, Google) are stubbed with dummy keys —
  no real calls are made.
- The container has **no production credentials**. Pushing migrations to the
  remote project (`supabase db push`) stays a deliberate action you run outside
  the container.

## Common commands

```bash
npm run dev          # Next.js dev server
npm run verify       # typecheck + lint + test (the full gate)
npm run db:reset     # re-apply migrations + seed to the local DB
npm run db:start     # start the local Supabase stack
npm run db:stop      # stop it
npm run build        # production build
```

## Running without the Dev Container

You can also run the local Supabase stack directly on your host:

```bash
supabase start && supabase db reset
```

Then create a `.env.local` (see `.devcontainer/postCreate.sh` for the exact
keys; on the host both the browser and server use `http://localhost:54321`, so
`SUPABASE_INTERNAL_URL` can be omitted) and run `npm run dev`.

## License

Copyright (C) 2026 Nuno Ribeiro.

Focal is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License, version 3, as published by the
Free Software Foundation. It is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY. See [`LICENSE`](./LICENSE) for the full text.

If you run a modified version as a network service, the AGPL requires you to
offer its users the corresponding source code.
