import { describe, it, expect } from "vitest"
import {
  computeCounterTotal,
  canClientCounterOffer,
  getActiveLineItems,
} from "@/lib/utils/deal-room-proposals"
import type { ProposalLineItem } from "@/lib/types/deal-room"

const lineItems: ProposalLineItem[] = [
  { name: "Base package", price: 2800, is_base: true },
  { name: "Drone footage", price: 350, is_base: false },
  { name: "Second shooter", price: 400, is_base: false },
]

describe("computeCounterTotal", () => {
  it("returns full total when nothing is removed", () => {
    expect(computeCounterTotal(lineItems, [])).toBe(3550)
  })

  it("subtracts the price of a removed item", () => {
    expect(computeCounterTotal(lineItems, ["Drone footage"])).toBe(3200)
  })

  it("handles removing multiple items", () => {
    expect(computeCounterTotal(lineItems, ["Drone footage", "Second shooter"])).toBe(2800)
  })

  it("returns 0 for an empty list", () => {
    expect(computeCounterTotal([], [])).toBe(0)
  })

  it("ignores removed names that are not in the list", () => {
    expect(computeCounterTotal(lineItems, ["Nonexistent"])).toBe(3550)
  })
})

describe("canClientCounterOffer", () => {
  it("returns true when status is sent and renegotiation is allowed", () => {
    expect(canClientCounterOffer({ status: "sent", allow_renegotiation: true })).toBe(true)
  })

  it("returns false when renegotiation is disabled", () => {
    expect(canClientCounterOffer({ status: "sent", allow_renegotiation: false })).toBe(false)
  })

  it("returns false when proposal is accepted", () => {
    expect(canClientCounterOffer({ status: "accepted", allow_renegotiation: true })).toBe(false)
  })

  it("returns false when awaiting photographer response after counter", () => {
    expect(canClientCounterOffer({ status: "countered", allow_renegotiation: true })).toBe(false)
  })
})

describe("getActiveLineItems", () => {
  it("returns all items when nothing is removed", () => {
    expect(getActiveLineItems(lineItems, [])).toEqual(lineItems)
  })

  it("filters out removed items by name", () => {
    const result = getActiveLineItems(lineItems, ["Drone footage"])
    expect(result).toHaveLength(2)
    expect(result.map((i) => i.name)).not.toContain("Drone footage")
  })

  it("returns empty array when all items are removed", () => {
    expect(getActiveLineItems(lineItems, lineItems.map((i) => i.name))).toEqual([])
  })
})
