/**
 * Tests for the booking status machine.
 *
 * Good tests here: verify external behaviour (allowed/blocked transitions),
 * NOT implementation details like the shape of the TRANSITIONS object.
 */
import { describe, it, expect } from "vitest";
import {
  canTransition,
  allowedNextStatuses,
  isTerminalStatus,
  isBackwardTransition,
  isForwardStepperTransition,
  getStepperTargetStatus,
  STATUS_STEPS,
} from "@/lib/utils/booking-status";
import type { BookingStatus } from "@/lib/types";

describe("canTransition", () => {
  // ── Valid forward transitions ──────────────────────────────────────────────

  it("allows inquiry → confirmed", () => {
    expect(canTransition("inquiry", "confirmed")).toBe(true);
  });

  it("allows confirmed → shoot_completed", () => {
    expect(canTransition("confirmed", "shoot_completed")).toBe(true);
  });

  it("allows shoot_completed → editing", () => {
    expect(canTransition("shoot_completed", "editing")).toBe(true);
  });

  it("allows editing → delivered", () => {
    expect(canTransition("editing", "delivered")).toBe(true);
  });

  it("allows delivered → done", () => {
    expect(canTransition("delivered", "done")).toBe(true);
  });

  // ── Cancellation from any non-terminal status ──────────────────────────────

  const cancellableStatuses: BookingStatus[] = [
    "inquiry",
    "confirmed",
    "shoot_completed",
    "editing",
    "delivered",
  ];

  cancellableStatuses.forEach((status) => {
    it(`allows ${status} → cancelled`, () => {
      expect(canTransition(status, "cancelled")).toBe(true);
    });
  });

  // ── Invalid: skipping steps ────────────────────────────────────────────────

  it("blocks inquiry → shoot_completed (skips confirmed)", () => {
    expect(canTransition("inquiry", "shoot_completed")).toBe(false);
  });

  it("blocks inquiry → editing (skips multiple steps)", () => {
    expect(canTransition("inquiry", "editing")).toBe(false);
  });

  it("blocks confirmed → delivered (skips steps)", () => {
    expect(canTransition("confirmed", "delivered")).toBe(false);
  });

  // ── Invalid: going backwards ───────────────────────────────────────────────

  it("blocks confirmed → inquiry (backwards)", () => {
    expect(canTransition("confirmed", "inquiry")).toBe(false);
  });

  it("blocks shoot_completed → confirmed (backwards)", () => {
    expect(canTransition("shoot_completed", "confirmed")).toBe(false);
  });

  it("blocks done → delivered (backwards from terminal)", () => {
    expect(canTransition("done", "delivered")).toBe(false);
  });

  // ── Invalid: from terminal statuses ───────────────────────────────────────

  it("blocks cancelled → confirmed (no recovery from cancelled)", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("blocks cancelled → inquiry (no recovery from cancelled)", () => {
    expect(canTransition("cancelled", "inquiry")).toBe(false);
  });

  it("blocks done → cancelled (done is terminal)", () => {
    expect(canTransition("done", "cancelled")).toBe(false);
  });

  // ── Invalid: self-transitions ──────────────────────────────────────────────

  it("blocks inquiry → inquiry (self-transition)", () => {
    expect(canTransition("inquiry", "inquiry")).toBe(false);
  });
});

describe("allowedNextStatuses", () => {
  it("returns confirmed and cancelled for inquiry", () => {
    const allowed = allowedNextStatuses("inquiry");
    expect(allowed).toContain("confirmed");
    expect(allowed).toContain("cancelled");
    expect(allowed).not.toContain("inquiry");
    expect(allowed).not.toContain("shoot_completed");
  });

  it("returns empty array for done (terminal)", () => {
    expect(allowedNextStatuses("done")).toHaveLength(0);
  });

  it("returns empty array for cancelled (terminal)", () => {
    expect(allowedNextStatuses("cancelled")).toHaveLength(0);
  });

  it("always contains cancelled for every non-terminal status", () => {
    const nonTerminal: BookingStatus[] = [
      "inquiry",
      "confirmed",
      "shoot_completed",
      "editing",
      "delivered",
    ];
    nonTerminal.forEach((status) => {
      expect(allowedNextStatuses(status)).toContain("cancelled");
    });
  });
});

describe("isTerminalStatus", () => {
  it("identifies cancelled as terminal", () => {
    expect(isTerminalStatus("cancelled")).toBe(true);
  });

  it("does not identify done as terminal (done is recoverable)", () => {
    expect(isTerminalStatus("done")).toBe(false);
  });

  it("does not identify active statuses as terminal", () => {
    const active: BookingStatus[] = [
      "inquiry",
      "confirmed",
      "shoot_completed",
      "editing",
      "delivered",
      "done",
    ];
    active.forEach((s) => expect(isTerminalStatus(s)).toBe(false));
  });
});

describe("isForwardStepperTransition", () => {
  it("returns true for a multi-step forward jump (inquiry → editing)", () => {
    expect(isForwardStepperTransition("inquiry", "editing")).toBe(true);
  });

  it("returns true for a one-step forward jump (confirmed → shoot_completed)", () => {
    expect(isForwardStepperTransition("confirmed", "shoot_completed")).toBe(true);
  });

  it("returns false for a backward transition", () => {
    expect(isForwardStepperTransition("editing", "confirmed")).toBe(false);
  });

  it("returns false when from is a terminal status", () => {
    expect(isForwardStepperTransition("done", "confirmed")).toBe(false);
  });

  it("returns true for a forward jump to done (done is not terminal)", () => {
    expect(isForwardStepperTransition("confirmed", "done")).toBe(true);
  });

  it("returns false for a self-transition", () => {
    expect(isForwardStepperTransition("editing", "editing")).toBe(false);
  });
});

describe("isBackwardTransition", () => {
  it("returns true when moving to an earlier step", () => {
    expect(isBackwardTransition("editing", "confirmed")).toBe(true);
  });

  it("returns true for a large backward jump", () => {
    expect(isBackwardTransition("delivered", "inquiry")).toBe(true);
  });

  it("returns false for a forward transition", () => {
    expect(isBackwardTransition("confirmed", "editing")).toBe(false);
  });

  it("returns false for a self-transition", () => {
    expect(isBackwardTransition("editing", "editing")).toBe(false);
  });

  it("returns true when moving back from done (done is not terminal)", () => {
    expect(isBackwardTransition("done", "confirmed")).toBe(true);
  });

  it("returns false when to is cancelled (not in STATUS_STEPS)", () => {
    expect(isBackwardTransition("editing", "cancelled")).toBe(false);
  });

  it("returns false when from is cancelled", () => {
    expect(isBackwardTransition("cancelled", "inquiry")).toBe(false);
  });
});

describe("getStepperTargetStatus", () => {
  // ── Forward clicks ────────────────────────────────────────────────────────

  it("advances from inquiry (index 0) to shoot_completed (index 2)", () => {
    expect(getStepperTargetStatus("inquiry", 2)).toBe("shoot_completed");
  });

  it("advances from confirmed (index 1) to delivered (index 4)", () => {
    expect(getStepperTargetStatus("confirmed", 4)).toBe("delivered");
  });

  it("advances one step at a time (inquiry → confirmed)", () => {
    expect(getStepperTargetStatus("inquiry", 1)).toBe("confirmed");
  });

  // ── Backward clicks ───────────────────────────────────────────────────────

  it("moves back when clicking an earlier step: editing (3) → click index 2 → confirmed (1)", () => {
    expect(getStepperTargetStatus("editing", 2)).toBe("confirmed");
  });

  it("moves back when clicking index 1 from delivered (4) → inquiry (0)", () => {
    expect(getStepperTargetStatus("delivered", 1)).toBe("inquiry");
  });

  it("moves back to inquiry when clicking index 0 from any later step", () => {
    expect(getStepperTargetStatus("shoot_completed", 0)).toBe("inquiry");
    expect(getStepperTargetStatus("delivered", 0)).toBe("inquiry");
  });

  // ── Self-click (uncheck current step) ────────────────────────────────────

  it("unchecks current step when clicked: confirmed (1) → inquiry (0)", () => {
    expect(getStepperTargetStatus("confirmed", 1)).toBe("inquiry");
  });

  it("unchecks current step when clicked: editing (3) → shoot_completed (2)", () => {
    expect(getStepperTargetStatus("editing", 3)).toBe("shoot_completed");
  });

  it("returns null when clicking step 0 (inquiry) while already at inquiry", () => {
    expect(getStepperTargetStatus("inquiry", 0)).toBeNull();
  });

  // ── Terminal guards ───────────────────────────────────────────────────────

  it("allows backward clicks from done (done is not terminal)", () => {
    // done is index 5; clicking step 0 → moves to inquiry
    expect(getStepperTargetStatus("done", 0)).toBe("inquiry");
    // done is index 5; clicking step 3 → moves to shoot_completed (step 3-1)
    expect(getStepperTargetStatus("done", 3)).toBe("shoot_completed");
  });

  it("returns null when current status is cancelled", () => {
    expect(getStepperTargetStatus("cancelled", 0)).toBeNull();
  });

  it("advances to done when clicking the done step from delivered", () => {
    const doneIndex = STATUS_STEPS.indexOf("done");
    expect(getStepperTargetStatus("delivered", doneIndex)).toBe("done");
  });

  it("allows multi-step jump to done from earlier statuses", () => {
    const doneIndex = STATUS_STEPS.indexOf("done");
    expect(getStepperTargetStatus("inquiry", doneIndex)).toBe("done");
  });

  // ── Cascade uncheck verification ──────────────────────────────────────────
  // Clicking step N while at step M > N resets to step N-1,
  // which implicitly unchecks N through M.

  it("clicking step 2 (shoot_completed) while at delivered (4) yields confirmed (1) — unchecks steps 2–4", () => {
    expect(getStepperTargetStatus("delivered", 2)).toBe("confirmed");
  });

  it("clicking step 3 (editing) while at done moves back to shoot_completed", () => {
    expect(getStepperTargetStatus("done", 3)).toBe("shoot_completed");
  });
});

describe("STATUS_STEPS", () => {
  it("starts with inquiry and ends with done", () => {
    expect(STATUS_STEPS[0]).toBe("inquiry");
    expect(STATUS_STEPS[STATUS_STEPS.length - 1]).toBe("done");
  });

  it("does not include cancelled (cancelled is a side branch)", () => {
    expect(STATUS_STEPS).not.toContain("cancelled");
  });

  it("has 6 steps (inquiry → confirmed → shoot_completed → editing → delivered → done)", () => {
    expect(STATUS_STEPS).toHaveLength(6);
  });
});
