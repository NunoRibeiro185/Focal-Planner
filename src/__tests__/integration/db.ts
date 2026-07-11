import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { randomUUID } from "node:crypto";

const HOST = process.env.INTEGRATION_DB_HOST ?? "host.docker.internal";
const PORT = Number(process.env.INTEGRATION_DB_PORT ?? "54329");

let pool: Pool | null = null;

export function getPool(): Pool {
  pool ??= new Pool({
    host: HOST,
    port: PORT,
    user: "postgres",
    password: "postgres",
    database: "postgres",
    max: 4,
  });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
}

/** Admin query — connects as `postgres` (table owner, bypasses RLS). For seeding. */
export function admin<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

/**
 * Run `fn` as the `authenticated` role with auth.uid() resolving to `sub`.
 * (The supabase/postgres image's auth.uid() reads `request.jwt.claim.sub`.)
 */
export async function asUser<T>(
  sub: string,
  fn: (q: <R extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<QueryResult<R>>) => Promise<T>
): Promise<T> {
  return withRole("authenticated", sub, fn);
}

/** Run `fn` as the `anon` role (no authenticated user). */
export async function asAnon<T>(
  fn: (q: <R extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<QueryResult<R>>) => Promise<T>
): Promise<T> {
  return withRole("anon", null, fn);
}

async function withRole<T>(
  role: "authenticated" | "anon",
  sub: string | null,
  fn: (q: <R extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<QueryResult<R>>) => Promise<T>
): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
    await client.query(`SET ROLE ${role}`);
    const q = <R extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) =>
      client.query<R>(sql, params);
    return await fn(q);
  } finally {
    // Reset connection state before returning it to the pool.
    try {
      await client.query("RESET ROLE");
      await client.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    } catch {
      /* ignore */
    }
    client.release();
  }
}

/**
 * Create a photographer (auth.users insert fires the handle_new_user trigger
 * that populates public.photographers). Returns the new photographer id.
 */
export async function newPhotographer(email?: string): Promise<string> {
  const id = randomUUID();
  const addr = email ?? `${id}@itest.dev`;
  await admin("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, addr]);
  // Ensure the profile row exists (trigger should have created it).
  await admin(
    `INSERT INTO public.photographers (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [id, addr]
  );
  return id;
}

/** Create a package template + version for a photographer; returns their ids. */
export async function newPackage(
  photographerId: string,
  basePrice = 1000
): Promise<{ templateId: string; versionId: string }> {
  const { rows: t } = await admin<{ id: string }>(
    `INSERT INTO public.package_templates (photographer_id, name) VALUES ($1, 'Test Package') RETURNING id`,
    [photographerId]
  );
  const templateId = t[0].id;
  const { rows: v } = await admin<{ id: string }>(
    `INSERT INTO public.package_versions
       (package_template_id, photographer_id, version_number, version_name, base_price, currency, hours_of_coverage)
     VALUES ($1, $2, 1, 'v1', $3, 'EUR', 8) RETURNING id`,
    [templateId, photographerId, basePrice]
  );
  const versionId = v[0].id;
  await admin(`UPDATE public.package_templates SET current_version_id = $1 WHERE id = $2`, [
    versionId,
    templateId,
  ]);
  return { templateId, versionId };
}
