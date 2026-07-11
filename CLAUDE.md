# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Living document. Consult it at the start of work and update it whenever architecture, conventions, or features change. PRDs live as GitHub issues (`gh issue list --state all`); implementation plans and specs live in `docs/superpowers/`.

## Product

**Focal** — a multi-tenant SaaS for wedding & portrait photographers to run their business: packages/pricing, bookings, scheduling, finances, inquiries, client collaboration, and post-production tracking. Every photographer is a tenant; data is isolated per `photographer_id`. Design intent and brand/voice live in `.impeccable.md` (read it before building UI — warm OKLCH stone/amber palette, Playfair + Montserrat, editorial restraint).

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build — also the full type-check gate
npm run lint         # ESLint (eslint-config-next)
npm run test         # Vitest, single run
npm run test:watch   # Vitest watch mode
npx vitest run src/__tests__/unit/currency.test.ts   # run a single test file
npx tsc --noEmit     # standalone type-check
npm run verify       # typecheck + lint + test in one shot (the full gate)
npm run db:start     # start the local Supabase stack (Docker)
npm run db:reset     # re-apply migrations + supabase/seed.sql to the local DB
supabase db push     # apply migrations in supabase/migrations to the linked remote project
```

**Verification gate before considering work done:** `npm run verify` (i.e. `npm run test`, `npm run lint`, and `npx tsc --noEmit`) must all pass. (`npm run build` runs the same type-check if you want a full build.) `npm run verify` is a **hard green gate**: it must exit 0 (typecheck clean, ESLint 0 errors, tests pass). ESLint still emits some pre-existing *warnings* (unused vars in older components, a library-compat notice) which don't fail the gate — don't add new errors, and prefer clearing warnings you touch.

### Local development (Dev Container)
The recommended setup is the **Dev Container** (`.devcontainer/`): it runs a local Supabase stack (via the host's Docker, docker-outside-of-docker) seeded with demo data, and never touches the production database. Open in Cursor → "Reopen in Container"; `postCreate.sh` installs deps, starts Supabase, runs the seed, and writes `.env.local`. See `README.md` for details. You can also run the stack on the host directly: `supabase start && supabase db reset`, then create `.env.local`.

**Local auth bypass:** set `DEV_BYPASS_AUTH=true` to skip Google OAuth — `src/lib/supabase/server.ts` resolves the seeded dev photographer (matched by the owner's email in the `photographers` table) and patches `auth.getUser()` to return it; `src/proxy.ts` skips the login redirect. In bypass mode the server client uses the **service-role key** so RLS (`photographer_id = auth.uid()`) doesn't hide data from the session-less dev user. Never enable in production.

**Container ↔ Supabase URLs:** the browser reaches Supabase at `localhost:54321`; the in-container server reaches it via `host.docker.internal:54321`, set as `SUPABASE_INTERNAL_URL`. `server.ts`, `service-role.ts`, and `proxy.ts` all prefer `SUPABASE_INTERNAL_URL` over `NEXT_PUBLIC_SUPABASE_URL` server-side (falling back to the public URL when unset, e.g. on the host).

## Architecture

Next.js 16 (App Router, React 19, Server Components), Supabase (Postgres + Auth + RLS), Tailwind v4 + shadcn/ui, Vitest, Resend (email), LemonSqueezy (billing), Vercel.

### Three-layer server pattern
Data flows through a strict separation — respect it when adding features:

1. **`src/lib/queries/*`** — read functions. Always `getUser()` first, then a request-cached Supabase client, then `.eq("photographer_id", user.id)`-scoped selects. Return enriched view-model types (e.g. `BookingListItem`).
2. **`src/lib/actions/*`** — `"use server"` mutations. Validate input with Zod schemas (from `src/lib/types/forms.ts`), check auth, write, then `revalidatePath`. Throw on invalid data; don't return error objects.
3. **`src/lib/utils/*`** — **pure functions** holding all business logic (pricing math, status transitions, entitlement checks, layout rules). No DB, no I/O. Each has a matching `src/__tests__/unit/*.test.ts`.

**Strong preference:** extract non-trivial business logic into a pure util and test it, rather than embedding it in an action or component. The utils + tests are the primary correctness guarantee; queries/actions are thin glue.

`src/lib/services/*` holds cross-cutting integrations and stateful logic (entitlements, email senders, Google Calendar, LemonSqueezy, access-token verification).

### Supabase clients (`src/lib/supabase/`)
- `server.ts` → `createClient()` / `getUser()` — request-memoized via React `cache()`. Use everywhere auth matters. RLS enforced.
- `client.ts` → browser client for client components.
- `service-role.ts` → **bypasses RLS.** Only for unauthenticated public flows (inquiry submission, client deal room, second-shooter view), where a token validated in app code replaces RLS. Never import in client components.

### Auth & routing
- Google OAuth via Supabase. A `handle_new_user` Postgres trigger auto-creates a `photographers` row on first sign-in.
- `src/proxy.ts` is the middleware: refreshes the session and gates routes. Public path prefixes: `/`, `/login`, `/auth/`, `/api/webhooks/`, `/inquiry/`, `/second-shooter/`, `/client/` (deal room). **When adding a public surface, add its prefix here** — `DEV_BYPASS_AUTH` skips the login redirect locally, so a missing prefix only breaks in production.
- Route groups under `src/app/`: `(app)` = authenticated dashboard (sidebar shell, `SubscriptionProvider`), `(auth)` = login, `(public)` = token-gated client/second-shooter pages, `(admin)`, `(legal)`, `api`.

### Pricing model: services + snapshots (core domain invariant)
Pricing is line-item based: `services` is the photographer's mutable catalog; `booking_services` rows are **immutable per-booking snapshots** (`name_snapshot`, `unit_price_snapshot`, etc., frozen when added to the booking). `total_price` = Σ(line items) − `discount_amount`, computed via the pure utils in `src/lib/utils/booking-builder.ts`. `package_templates` + `package_template_services` survive only as *presets* that pre-fill the builder. **Never recompute a booking's price from the live catalog — snapshots are the record of what was sold.**

**Dropped in Phase 3 (2026-07-12) — gone, don't reintroduce:** the `deliverable_statuses`, `booking_deliverable_progress`, `booking_extras`, `extras` tables, the `deliverable_key` enum, and the `reassign_booking_package` RPC. `create_booking_atomic` no longer takes `p_deliverable_keys`. Their data was migrated into `services`/`booking_services` back in 20260515000001.

**Still legacy but deferred (package versioning is load-bearing — see Phase 3 scope note):** `package_versions`, `bookings.package_version_id` / `price_override` / `hours_override`, `custom_field_definitions`, `package_version_custom_fields`. The packages feature (create/edit, version history, analytics, booking builder) still rides on these; retiring them is a feature migration, not cleanup. Decision 2026-07-11; see `docs/superpowers/plans/2026-07-11-hardening-and-cleanup-plan.md`.

### Booking lifecycle
Status flow enforced by `src/lib/utils/booking-status.ts` (`canTransition`): `inquiry → confirmed → shoot_completed → editing → delivered → done`, with `cancelled` reachable from any non-terminal state. `done`/`cancelled` are terminal. Inquiries are bookings with `status = "inquiry"` (the two were merged — see migration `20260331000000_merge_inquiries_into_bookings`).

### Entitlements & paywall
Tiers (`src/config/plans.ts`): `free` / `pro`, with an effective `trial` tier. `getEffectiveTier()` resolves: during `LAUNCH_WINDOW` everyone is `trial` (full Pro, free); after launch, active subscription → `pro`, else `free`. Feature gates and usage limits are pure functions in `src/lib/services/entitlements.ts`, surfaced to client components via `SubscriptionProvider` / `useSubscription()` and `src/components/paywall/*`. Billing webhooks land at `/api/webhooks/lemonsqueezy`.

### Public/token-gated flows
Inquiry forms, the second-shooter view, and the **client deal room** (`/(public)/client/[bookingId]?token=`) all follow the same shape: unguessable token validated as the **first step** of every read/mutation, data accessed via the service-role client, business logic in tested pure utils, emails fire-and-forget via Resend. When adding a public surface, mirror this exactly — do not rely on RLS for these.

## Database
Migrations are plain SQL in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`, applied with `supabase db push` to the linked remote project (no local stack in the standard flow). RLS policies are part of each migration and scope rows to the owning photographer.

**Database types are generated, not hand-written.** `src/lib/types/supabase.ts` is the generated schema (`Database` type with Row/Insert/Update/Relationships/Functions) — regenerate it after every migration with `npm run db:types` (needs the local stack, or run `supabase gen types typescript --db-url <url>`). `src/lib/types/database.ts` is the app-facing façade: base row/enum types are aliases of the generated schema (`Row<"bookings">`, `Enums["booking_status"]`), plus enriched view-model interfaces. All three Supabase clients are typed with `Database`, so inserts/updates/RPC calls are type-checked — avoid `as any`; use the generated `Insert<"t">`/`Update<"t">`/`Json` helpers instead.

**SECURITY DEFINER function rules** (see `20260711000000_secure_rpcs.sql`):
- Any function taking `p_photographer_id` must start with the caller-identity guard: `if auth.uid() is not null and auth.uid() <> p_photographer_id then raise exception` (null uid = trusted service-role caller, incl. the dev-bypass client).
- Set EXECUTE grants explicitly per role; functions that must only be reached through a server action (e.g. `submit_inquiry_public`, whose Turnstile check lives in the action) get `revoke ... from anon, authenticated`.
- `create or replace function` with a **changed argument list creates an overload, not a replacement** — `drop function` the old signature in the same migration.

**Secrets fail closed:** code must never fall back to a default secret or verify signatures against an empty one (see `second-shooter-access.ts`, the LemonSqueezy webhook route). Missing secret in production = throw/500, not degrade.

## Testing
Vitest, config in `vitest.config.mts`. `environment: "node"` by default; component tests opt into jsdom via a `@vitest-environment` directive. Unit tests live in `src/__tests__/unit` and import via the `@/` alias. The bulk of meaningful tests target pure utils — when you add business logic, add a test alongside it.

**Integration tests** (`src/__tests__/integration/`, run via `npm run test:integration`, config `vitest.integration.config.mts`) are excluded from the default `npm test`. A vitest `globalSetup` boots a throwaway `supabase/postgres` container, applies the full migration chain over TCP (via `pg`, connecting at `host.docker.internal:54329`), and tears it down after. They exercise **RLS + the SECURITY DEFINER RPCs at the SQL layer** — `db.ts` provides `admin()` (bypasses RLS for seeding), `asUser(sub, …)` / `asAnon(…)` (run as the `authenticated`/`anon` role with `auth.uid()` = `sub`), and `newPhotographer`/`newPackage` factories. Use these to assert tenant isolation and RPC guards; requires Docker (the suite no-ops if unavailable). Note: the local `supabase start` doesn't work in this dev container, which is why the harness manages Postgres itself.
