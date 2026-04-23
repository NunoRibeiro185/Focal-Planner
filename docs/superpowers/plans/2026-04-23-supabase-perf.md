# Supabase Performance Optimisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate unnecessary Supabase round-trips that make the app feel slow.

**Architecture:** Three changes — (1) add Next.js middleware so session tokens are refreshed in the edge before hitting any server component, removing the blocking `getUser()` auth network call from every render; (2) collapse the 2-query waterfall in `getBookings` / `getAllBookingsByDateRange` into a single nested select; (3) collapse the 3-query waterfall in `getPackageTemplates` into 2 parallel-friendly queries using Supabase's `count` aggregate on nested relations.

**Tech Stack:** Next.js 14 App Router, Supabase SSR (`@supabase/ssr`), Vitest

---

## File Map

| Action | File |
|--------|------|
| Create | `src/middleware.ts` |
| Modify | `src/lib/queries/bookings.ts` — `getBookings`, `getAllBookingsByDateRange` |
| Modify | `src/lib/queries/packages.ts` — `getPackageTemplates`, `getPackageTemplatesForBooking` |

---

### Task 1: Add session-refresh middleware

Without `middleware.ts`, Supabase can't refresh expired access tokens on the edge. Every server component then calls `supabase.auth.getUser()` which may hit the Supabase auth API over the network (a blocking round-trip) before any data query can run.

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create the middleware file**

```ts
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session token if it's expired. Must not be removed.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verify the dev server starts cleanly**

```bash
pnpm dev
```

Expected: server starts, navigating to any page still works, no auth errors in console.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "perf: add supabase session-refresh middleware"
```

---

### Task 2: Fix `getBookings` — eliminate the template-name waterfall

`getBookings` and `getAllBookingsByDateRange` each do two sequential queries: fetch bookings, then fetch `package_templates` names. We can include the template name in the first query by following the FK chain `package_versions → package_templates`.

**Files:**
- Modify: `src/lib/queries/bookings.ts:30-53` (`getBookings`)
- Modify: `src/lib/queries/bookings.ts:115-139` (`getAllBookingsByDateRange`)

- [ ] **Step 1: Update the select in `getBookings` to join the template name**

In `src/lib/queries/bookings.ts`, replace the `getBookings` function body (lines 24–70) with:

```ts
export async function getBookings(): Promise<BookingListItem[]> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*, template:package_templates(id, name)),
       payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .eq("is_archived", false)
    .order("event_date", { ascending: true });

  if (error) throw error;

  return (bookings ?? []).map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      package_name: b.package_version?.template?.name ?? null,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
      is_second_shooter: b.second_shooter_id === user.id,
    };
  });
}
```

- [ ] **Step 2: Apply the same fix to `getAllBookingsByDateRange` (lines 106–155)**

Replace that function body with:

```ts
export async function getAllBookingsByDateRange(
  start: string,
  end: string
): Promise<BookingListItem[]> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `*,
       package_version:package_versions(*, template:package_templates(id, name)),
       payment_log_entries(amount)`
    )
    .eq("photographer_id", user.id)
    .gte("event_date", start)
    .lte("event_date", end)
    .order("event_date", { ascending: true });

  if (error) throw error;

  return (bookings ?? []).map((b: any) => {
    const amountPaid = computeAmountPaid(
      (b.payment_log_entries ?? []).map((e: { amount: number }) => e.amount)
    );
    const balance = computeBalance(b.total_price, amountPaid);
    return {
      ...b,
      package_version: b.package_version,
      package_name: b.package_version?.template?.name ?? null,
      amount_paid: amountPaid,
      balance,
      overdue: isOverdue(b.payment_due_date, balance),
      is_second_shooter: false,
    };
  });
}
```

- [ ] **Step 3: Smoke-test in the browser**

Start dev server and open `/bookings`. Verify the booking list loads with package names still showing correctly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/bookings.ts
git commit -m "perf: inline package template name into bookings query"
```

---

### Task 3: Fix `getPackageTemplates` — merge booking-count query into versions fetch

Currently: templates → (need IDs) → versions → (need version IDs) → booking counts = **3 serial round-trips**.

Fix: fetch templates first, then fetch versions _with_ booking counts in a single query using Supabase's nested `count` aggregate. This becomes **2 round-trips**, with the versions+counts query being a single call.

**Files:**
- Modify: `src/lib/queries/packages.ts:10-69` (`getPackageTemplates`)

- [ ] **Step 1: Replace `getPackageTemplates` with the 2-query version**

Replace the entire `getPackageTemplates` function (lines 10–69) in `src/lib/queries/packages.ts` with:

```ts
export async function getPackageTemplates(): Promise<PackageTemplateForList[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: templates, error } = await supabase
    .from("package_templates")
    .select(
      `*,
      current_version:package_versions!fk_current_version(
        *,
        custom_fields:package_version_custom_fields(
          *,
          definition:custom_field_definitions(label, field_type)
        )
      )`
    )
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const templateIds = (templates ?? []).map((t) => t.id);

  let allVersions: (PackageVersion & { bookings: { count: number }[] })[] = [];
  if (templateIds.length > 0) {
    const { data: versions } = await supabase
      .from("package_versions")
      .select("*, bookings(count)")
      .in("package_template_id", templateIds)
      .order("version_number", { ascending: false });
    allVersions = (versions ?? []) as typeof allVersions;
  }

  const versionsByTemplate = new Map<string, PackageVersionWithBookingCount[]>();
  allVersions.forEach((v) => {
    const list = versionsByTemplate.get(v.package_template_id) ?? [];
    list.push({ ...v, booking_count: v.bookings?.[0]?.count ?? 0 });
    versionsByTemplate.set(v.package_template_id, list);
  });

  return (templates ?? []).map((t) => ({
    ...t,
    all_versions: versionsByTemplate.get(t.id) ?? [],
  })) as PackageTemplateForList[];
}
```

- [ ] **Step 2: Smoke-test in the browser**

Open `/packages`. Verify package cards load with correct version history and booking counts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/packages.ts
git commit -m "perf: merge booking-count query into versions fetch in getPackageTemplates"
```

---

### Task 4: Fix `getPackageTemplatesForBooking` — single nested select

Currently fetches templates then separately fetches versions = **2 serial round-trips**.

Fix: include `all_versions:package_versions(*)` in the initial templates select, letting Supabase join via the `package_template_id` FK in a single round-trip. Filter archived versions in JS (number of archived versions per template is small).

**Files:**
- Modify: `src/lib/queries/packages.ts:71-110` (`getPackageTemplatesForBooking`)

- [ ] **Step 1: Replace `getPackageTemplatesForBooking` with the single-query version**

Replace lines 71–110 in `src/lib/queries/packages.ts` with:

```ts
export async function getPackageTemplatesForBooking(): Promise<PackageTemplateForBooking[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: templates, error } = await supabase
    .from("package_templates")
    .select(
      `*,
      current_version:package_versions!fk_current_version(*),
      all_versions:package_versions(*)`
    )
    .eq("photographer_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (templates ?? []).map((t: any) => ({
    ...t,
    current_version: t.current_version as PackageVersion | null,
    all_versions: ((t.all_versions ?? []) as PackageVersion[])
      .filter((v) => !v.archived)
      .sort((a, b) => b.version_number - a.version_number),
  })) as PackageTemplateForBooking[];
}
```

- [ ] **Step 2: Smoke-test in the browser**

Open the new-booking form and verify the package selector still shows all active packages with their versions.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/packages.ts
git commit -m "perf: fetch package versions inline in getPackageTemplatesForBooking"
```
