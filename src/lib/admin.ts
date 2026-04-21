export const ADMIN_EMAILS = [
  "nunomonizribeiro@gmail.com",
  "admin@focalplanner.com",
];

export function isAdminEmail(email: string | undefined | null): boolean {
  return ADMIN_EMAILS.includes((email ?? "").toLowerCase());
}
