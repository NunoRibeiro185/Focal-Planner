import { describe, it, expect } from "vitest"
import {
  generateClientToken,
  verifyClientToken,
} from "@/lib/services/deal-room-access"

describe("generateClientToken", () => {
  it("returns a v4 UUID string", () => {
    const token = generateClientToken()
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it("returns a different token on each call", () => {
    expect(generateClientToken()).not.toBe(generateClientToken())
  })
})

describe("verifyClientToken", () => {
  const token = "550e8400-e29b-41d4-a716-446655440000"

  it("returns true when stored and provided tokens match", () => {
    expect(verifyClientToken(token, token)).toBe(true)
  })

  it("returns false when tokens differ", () => {
    expect(verifyClientToken(token, "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(false)
  })

  it("returns false when stored token is null", () => {
    expect(verifyClientToken(null, token)).toBe(false)
  })

  it("returns false when provided token is null", () => {
    expect(verifyClientToken(token, null)).toBe(false)
  })

  it("returns false when provided token is empty string", () => {
    expect(verifyClientToken(token, "")).toBe(false)
  })
})
