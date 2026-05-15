import { timingSafeEqual } from "crypto"

export function generateClientToken(): string {
  return crypto.randomUUID()
}

export function verifyClientToken(
  storedToken: string | null,
  providedToken: string | null
): boolean {
  if (!storedToken || !providedToken) return false
  if (storedToken.length !== providedToken.length) return false
  return timingSafeEqual(Buffer.from(storedToken), Buffer.from(providedToken))
}
