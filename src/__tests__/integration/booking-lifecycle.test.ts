import { describe, it, expect, beforeAll } from "vitest";
import { admin, asUser, newPhotographer } from "./db";

let P: string;

beforeAll(async () => {
  P = await newPhotographer();
});

describe("create_booking_atomic: atomic booking + task creation", () => {
  it("creates the booking plus its tasks in one call", async () => {
    const res = await asUser(P, (q) =>
      q<{ id: string }>(
        `select public.create_booking_atomic(
           p_photographer_id := $1,
           p_client_name_primary := 'Lifecycle Client',
           p_event_date := '2027-09-09',
           p_total_price := 1200,
           p_status := 'confirmed',
           p_task_titles := array['Send contract','Confirm timeline'],
           p_task_template_ids := array[null, null]::uuid[],
           p_task_sort_orders := array[0, 1]
         ) as id`,
        [P]
      )
    );
    const bookingId = res.rows[0].id;
    expect(bookingId).toMatch(/^[0-9a-f-]{36}$/);

    const booking = await admin<{ status: string; total_price: string }>(
      "select status, total_price::text as total_price from public.bookings where id = $1",
      [bookingId]
    );
    expect(booking.rows[0].status).toBe("confirmed");
    expect(booking.rows[0].total_price).toBe("1200.00");

    const tasks = await admin(
      "select id from public.booking_tasks where booking_id = $1 order by sort_order",
      [bookingId]
    );
    expect(tasks.rowCount).toBe(2);
  });
});

// NOTE: reassign_booking_package is intentionally NOT exercised here beyond its
// auth guard (covered in rls-rpc-security.test.ts). Its body still references
// package_versions columns (edited_photos_count, wedding_album, …) that migration
// 20260421000000 dropped, so any real call throws "column does not exist" — a
// live bug in the updateBookingPackage action. This whole path is retired in
// Phase 3; see the plan's 3.x notes.

describe("bookings updated_at trigger", () => {
  it("bumps updated_at on update", async () => {
    const { rows } = await admin<{ id: string; updated_at: string }>(
      `INSERT INTO public.bookings (photographer_id, client_name_primary, total_price)
       VALUES ($1, 'Trigger Client', 10) RETURNING id, updated_at`,
      [P]
    );
    const { id, updated_at: before } = rows[0];

    await new Promise((r) => setTimeout(r, 10));
    await admin("update public.bookings set notes = 'touched' where id = $1", [id]);

    const after = await admin<{ updated_at: string }>(
      "select updated_at from public.bookings where id = $1",
      [id]
    );
    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThan(
      new Date(before).getTime()
    );
  });
});

describe("payment log accumulates against a booking", () => {
  it("records payments scoped to the booking", async () => {
    const { rows } = await admin<{ id: string }>(
      `INSERT INTO public.bookings (photographer_id, client_name_primary, total_price)
       VALUES ($1, 'Paying Client', 900) RETURNING id`,
      [P]
    );
    const bookingId = rows[0].id;

    for (const amount of [300, 600]) {
      await admin(
        `INSERT INTO public.payment_log_entries (booking_id, photographer_id, amount, paid_date)
         VALUES ($1, $2, $3, '2027-01-01')`,
        [bookingId, P, amount]
      );
    }

    const sum = await admin<{ total: string }>(
      "select coalesce(sum(amount),0)::text as total from public.payment_log_entries where booking_id = $1",
      [bookingId]
    );
    expect(sum.rows[0].total).toBe("900.00");
  });
});
