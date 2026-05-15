import { describe, it, expect } from "vitest";
import {
  computeSubtotal,
  computeFinalPrice,
  toBookingServiceInserts,
  type BuilderLineItem,
} from "@/lib/utils/booking-builder";

function makeItem(
  unitPrice: number,
  quantity: number,
  overrides?: Partial<BuilderLineItem>
): BuilderLineItem {
  return {
    service_id: null,
    name_snapshot: "Test Service",
    description_snapshot: null,
    unit_price_snapshot: unitPrice,
    quantity,
    track_completion_snapshot: false,
    ...overrides,
  };
}

describe("computeSubtotal", () => {
  it("returns 0 for empty items", () => {
    expect(computeSubtotal([])).toBe(0);
  });

  it("calculates a single item", () => {
    expect(computeSubtotal([makeItem(100, 1)])).toBe(100);
  });

  it("multiplies unit price by quantity", () => {
    expect(computeSubtotal([makeItem(50, 3)])).toBe(150);
  });

  it("sums multiple items", () => {
    expect(computeSubtotal([makeItem(100, 1), makeItem(50, 2)])).toBe(200);
  });

  it("handles zero-price items", () => {
    expect(computeSubtotal([makeItem(0, 5)])).toBe(0);
  });

  it("handles fractional prices", () => {
    expect(computeSubtotal([makeItem(33.33, 3)])).toBeCloseTo(99.99);
  });
});

describe("computeFinalPrice", () => {
  it("subtracts discount from subtotal", () => {
    expect(computeFinalPrice(2000, 500)).toBe(1500);
  });

  it("clamps to 0 when discount exceeds subtotal", () => {
    expect(computeFinalPrice(1000, 1500)).toBe(0);
  });

  it("returns subtotal when discount is 0", () => {
    expect(computeFinalPrice(2000, 0)).toBe(2000);
  });

  it("returns 0 when discount equals subtotal", () => {
    expect(computeFinalPrice(1000, 1000)).toBe(0);
  });
});

describe("toBookingServiceInserts", () => {
  it("maps items to DB insert rows with correct snapshots", () => {
    const items: BuilderLineItem[] = [
      makeItem(200, 1, {
        service_id: "abc-123",
        name_snapshot: "Album",
        description_snapshot: "Wedding album",
        track_completion_snapshot: true,
      }),
    ];
    const result = toBookingServiceInserts(items, "booking-id", "photographer-id");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      booking_id: "booking-id",
      photographer_id: "photographer-id",
      service_id: "abc-123",
      name_snapshot: "Album",
      description_snapshot: "Wedding album",
      unit_price_snapshot: 200,
      quantity: 1,
      track_completion_snapshot: true,
      done: false,
      sort_order: 0,
    });
  });

  it("assigns sort_order from array index", () => {
    const items = [makeItem(100, 1), makeItem(200, 1), makeItem(300, 1)];
    const result = toBookingServiceInserts(items, "b", "p");
    expect(result.map((r) => r.sort_order)).toEqual([0, 1, 2]);
  });

  it("always sets done to false", () => {
    const items = [makeItem(100, 1)];
    const result = toBookingServiceInserts(items, "b", "p");
    expect(result[0].done).toBe(false);
  });

  it("handles null service_id for custom items", () => {
    const items = [makeItem(150, 1, { service_id: null })];
    const result = toBookingServiceInserts(items, "b", "p");
    expect(result[0].service_id).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(toBookingServiceInserts([], "b", "p")).toEqual([]);
  });
});
