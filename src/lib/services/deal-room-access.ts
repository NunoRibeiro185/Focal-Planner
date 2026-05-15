export function generateClientToken(): string {
  return crypto.randomUUID()
}

export function verifyClientToken(
  storedToken: string | null,
  providedToken: string | null
): boolean {
  if (!storedToken || !providedToken) return false
  return storedToken === providedToken
}
