import { describe, it, expect } from "vitest";
import { admin, newPhotographer } from "./db";

describe("integration harness smoke", () => {
  it("has the schema + supabase roles", async () => {
    const { rows } = await admin<{ n: string }>(
      "select count(*)::text as n from pg_roles where rolname in ('anon','authenticated','service_role')"
    );
    expect(rows[0].n).toBe("3");
  });

  it("handle_new_user trigger creates a photographers row", async () => {
    const id = await newPhotographer();
    const { rows } = await admin<{ id: string }>(
      "select id from public.photographers where id = $1",
      [id]
    );
    expect(rows).toHaveLength(1);
  });
});
