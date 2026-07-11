import { describe, it, expect, beforeAll } from "vitest";
import { admin, asUser, asAnon, newPhotographer, newPackage } from "./db";

let A: string; // attacker / tenant A
let B: string; // victim / tenant B
let bookingA: string; // a booking owned by A

beforeAll(async () => {
  A = await newPhotographer();
  B = await newPhotographer();
  const { rows } = await admin<{ id: string }>(
    `INSERT INTO public.bookings (photographer_id, client_name_primary, total_price, event_date)
     VALUES ($1, 'Tenant A Client', 500, '2027-06-01') RETURNING id`,
    [A]
  );
  bookingA = rows[0].id;
});

describe("RLS: tenant isolation on bookings", () => {
  it("owner can read their own booking", async () => {
    const res = await asUser(A, (q) => q("select id from public.bookings where id = $1", [bookingA]));
    expect(res.rowCount).toBe(1);
  });

  it("another tenant cannot read it", async () => {
    const res = await asUser(B, (q) => q("select id from public.bookings where id = $1", [bookingA]));
    expect(res.rowCount).toBe(0);
  });

  it("another tenant cannot update it (0 rows affected)", async () => {
    const res = await asUser(B, (q) =>
      q("update public.bookings set client_name_primary = 'hacked' where id = $1", [bookingA])
    );
    expect(res.rowCount).toBe(0);
    const check = await admin<{ n: string }>(
      "select client_name_primary as n from public.bookings where id = $1",
      [bookingA]
    );
    expect(check.rows[0].n).toBe("Tenant A Client");
  });

  it("another tenant cannot delete it (0 rows affected)", async () => {
    const res = await asUser(B, (q) => q("delete from public.bookings where id = $1", [bookingA]));
    expect(res.rowCount).toBe(0);
  });

  it("a tenant cannot insert a row owned by someone else (WITH CHECK)", async () => {
    await expect(
      asUser(B, (q) =>
        q(
          `insert into public.bookings (photographer_id, client_name_primary, total_price)
           values ($1, 'spoofed', 1)`,
          [A]
        )
      )
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("RLS: tenant isolation on other owned tables", () => {
  it("blocks cross-tenant reads on package_templates and expenses", async () => {
    const { templateId } = await newPackage(A);
    await admin(
      `INSERT INTO public.expenses (photographer_id, category, description, amount, currency, expense_date)
       VALUES ($1, 'equipment', 'lens', 200, 'EUR', '2027-01-01')`,
      [A]
    );

    const tpl = await asUser(B, (q) =>
      q("select id from public.package_templates where id = $1", [templateId])
    );
    expect(tpl.rowCount).toBe(0);

    const exp = await asUser(B, (q) =>
      q("select id from public.expenses where photographer_id = $1", [A])
    );
    expect(exp.rowCount).toBe(0);
  });
});

describe("RPC: create_booking_atomic caller-identity guard (Phase 0 exploit)", () => {
  it("rejects when an authenticated user targets another tenant", async () => {
    await expect(
      asUser(A, (q) =>
        q("select public.create_booking_atomic(p_photographer_id := $1, p_client_name_primary := 'x', p_event_date := '2027-01-01')", [B])
      )
    ).rejects.toThrow(/Access denied/);
  });

  it("allows an authenticated user to act on their own tenant", async () => {
    const res = await asUser(A, (q) =>
      q<{ create_booking_atomic: string }>(
        "select public.create_booking_atomic(p_photographer_id := $1, p_client_name_primary := 'x', p_event_date := '2027-01-01') as create_booking_atomic",
        [A]
      )
    );
    expect(res.rows[0].create_booking_atomic).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("RPC: reassign_booking_package caller-identity guard (Phase 0 exploit)", () => {
  it("rejects when an authenticated user targets another tenant", async () => {
    await expect(
      asUser(A, (q) =>
        q(
          "select public.reassign_booking_package($1, $2, $3, $4)",
          [bookingA, B, "00000000-0000-0000-0000-000000000000", 100]
        )
      )
    ).rejects.toThrow(/Access denied/);
  });
});

describe("RPC: submit_inquiry_public is not callable by anon/authenticated (Turnstile bypass)", () => {
  const call =
    "select public.submit_inquiry_public(p_photographer_url := 'x', p_form_url := 'y', p_client_name_primary := 'z', p_client_email := 'a@b.c')";

  it("anon cannot execute it", async () => {
    await expect(asAnon((q) => q(call))).rejects.toThrow(/permission denied/i);
  });

  it("authenticated cannot execute it", async () => {
    await expect(asUser(A, (q) => q(call))).rejects.toThrow(/permission denied/i);
  });
});

describe("RLS: accepted second shooter can read the booking, pending cannot", () => {
  it("accepted second shooter sees the booking; pending does not", async () => {
    const C = await newPhotographer(); // the second shooter

    const { rows } = await admin<{ id: string }>(
      `INSERT INTO public.bookings (photographer_id, client_name_primary, total_price, second_shooter_id, second_shooter_invite_status)
       VALUES ($1, 'Shared', 300, $2, 'pending') RETURNING id`,
      [A, C]
    );
    const shared = rows[0].id;

    // pending → cannot read
    const pending = await asUser(C, (q) => q("select id from public.bookings where id = $1", [shared]));
    expect(pending.rowCount).toBe(0);

    // accept → can read
    await admin("update public.bookings set second_shooter_invite_status = 'accepted' where id = $1", [shared]);
    const accepted = await asUser(C, (q) => q("select id from public.bookings where id = $1", [shared]));
    expect(accepted.rowCount).toBe(1);
  });
});
