import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

/**
 * Integration-test global setup.
 *
 * The dev container cannot run `supabase start` (the CLI health-check binds to
 * 127.0.0.1, which the sibling containers don't publish there), so we boot a
 * throwaway supabase/postgres container directly, apply the full migration
 * chain, and let tests connect over TCP via `pg`. This exercises RLS + the
 * SECURITY DEFINER RPCs — exactly what Phase 0 hardened.
 *
 * All setup talks to the *published TCP port*: the supabase image restarts
 * Postgres once after its first-boot bootstrap, and only the final instance
 * binds TCP — so a successful TCP connection means the DB is truly ready
 * (avoids a race against the bootstrap→restart window).
 *
 * Skipped automatically if Docker isn't available; the suite then no-ops.
 */

const CONTAINER = "focal-itest";
const IMAGE = "public.ecr.aws/supabase/postgres:17.6.1.084";
const HOST = process.env.INTEGRATION_DB_HOST ?? "host.docker.internal";
const PORT = Number(process.env.INTEGRATION_DB_PORT ?? "54329");
const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

function dockerQuiet(args: string[]): void {
  try {
    docker(args);
  } catch {
    /* ignore */
  }
}

function connect(): Client {
  return new Client({ host: HOST, port: PORT, user: "postgres", password: "postgres", database: "postgres", ssl: false });
}

export default async function setup(): Promise<() => void> {
  try {
    docker(["info"]);
  } catch {
    console.warn("[integration] Docker unavailable — integration tests will skip.");
    return () => {};
  }

  dockerQuiet(["rm", "-f", CONTAINER]);
  docker([
    "run", "-d", "--name", CONTAINER,
    "-e", "POSTGRES_PASSWORD=postgres",
    "-e", "POSTGRES_DB=postgres",
    "-p", `${PORT}:5432`,
    IMAGE,
  ]);

  // Wait for the final (TCP-bound) instance with the supabase roles present.
  const deadline = Date.now() + 90_000;
  for (;;) {
    const client = connect();
    try {
      await client.connect();
      const { rows } = await client.query<{ n: string }>(
        "select count(*)::text as n from pg_roles where rolname in ('anon','authenticated','service_role')"
      );
      if (rows[0].n === "3") {
        await client.end();
        break;
      }
    } catch {
      /* not ready yet */
    }
    try { await client.end(); } catch { /* ignore */ }
    if (Date.now() > deadline) {
      dockerQuiet(["rm", "-f", CONTAINER]);
      throw new Error("[integration] Postgres did not become ready in time");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Apply migrations in filename order over TCP (pg simple protocol handles
  // multi-statement + dollar-quoted files correctly).
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const migrator = connect();
  await migrator.connect();
  try {
    for (const file of files) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
      try {
        await migrator.query(sql);
      } catch (e) {
        throw new Error(`[integration] migration ${file} failed: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    await migrator.end().catch(() => {});
    dockerQuiet(["rm", "-f", CONTAINER]);
    throw e;
  }
  await migrator.end();

  return () => {
    dockerQuiet(["rm", "-f", CONTAINER]);
  };
}
