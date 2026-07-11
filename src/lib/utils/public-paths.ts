/**
 * Route prefixes that never require authentication. Kept as a pure, exported
 * function so the set is unit-testable independently of the middleware (a
 * missing prefix here only breaks in production, since DEV_BYPASS_AUTH skips
 * the login redirect locally — see src/proxy.ts).
 *
 * When you add a public surface (a token-gated page, a webhook, a public form),
 * add its prefix here AND add a case to the test.
 */
export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/auth/",
  "/api/webhooks/",
  "/inquiry/",
  "/second-shooter/",
  "/client/", // client deal room (token-gated in the page)
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
