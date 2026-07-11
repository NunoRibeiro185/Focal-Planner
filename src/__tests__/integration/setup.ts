import { afterAll } from "vitest";
import { closePool } from "./db";

// Close the shared pg pool once this worker's files are done.
afterAll(async () => {
  await closePool();
});
