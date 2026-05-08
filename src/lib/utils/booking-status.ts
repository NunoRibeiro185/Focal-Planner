import type { BookingStatus } from "@/lib/types";

/**
 * Valid forward transitions for booking status.
 * "cancelled" is reachable from any non-terminal status.
 * Once in "done" or "cancelled" no further transitions are allowed.
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  inquiry: ["confirmed", "cancelled"],
  confirmed: ["shoot_completed", "cancelled"],
  shoot_completed: ["editing", "cancelled"],
  editing: ["delivered", "cancelled"],
  delivered: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  inquiry: "#f59e0b",
  confirmed: "#3b82f6",
  shoot_completed: "#8b5cf6",
  editing: "#06b6d4",
  delivered: "#10b981",
  done: "#6b7280",
  cancelled: "#ef4444",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  inquiry: "Inquiry",
  confirmed: "Confirmed",
  shoot_completed: "Shoot Completed",
  editing: "Editing",
  delivered: "Delivered",
  done: "Done",
  cancelled: "Cancelled",
};

/** Ordered list for the status stepper (excluding cancelled) */
export const STATUS_STEPS: BookingStatus[] = [
  "inquiry",
  "confirmed",
  "shoot_completed",
  "editing",
  "delivered",
  "done",
];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(current: BookingStatus): BookingStatus[] {
  return TRANSITIONS[current];
}

export function isTerminalStatus(status: BookingStatus): boolean {
  return status === "cancelled";
}

/**
 * Returns true if transitioning from → to is a backward move through the
 * ordered STATUS_STEPS list. Both statuses must be in STATUS_STEPS (i.e.
 * non-terminal, non-cancelled) and `to` must come before `from`.
 */
export function isBackwardTransition(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  if (isTerminalStatus(from)) return false;
  const fromIdx = STATUS_STEPS.indexOf(from);
  const toIdx = STATUS_STEPS.indexOf(to);
  return fromIdx > 0 && toIdx >= 0 && toIdx < fromIdx;
}

/**
 * Returns true if transitioning from → to is a multi-step forward jump
 * through non-terminal statuses that isn't covered by canTransition.
 * The stepper allows jumping to any step ahead, not just the immediate next.
 */
export function isForwardStepperTransition(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  if (isTerminalStatus(from) || isTerminalStatus(to)) return false;
  const fromIdx = STATUS_STEPS.indexOf(from);
  const toIdx = STATUS_STEPS.indexOf(to);
  return fromIdx >= 0 && toIdx > fromIdx;
}

/**
 * Returns the target status when a step in the progress stepper is clicked.
 *
 * Forward click (N > current): navigate directly to STATUS_STEPS[N].
 * Backward/self click (N <= current): "uncheck" behavior — go to STATUS_STEPS[N-1].
 *   Clicking step 0 while already at step 0 (inquiry self-click) is a no-op → null.
 *   Clicking step 0 from any later step goes back to inquiry (can't go before it).
 */
export function getStepperTargetStatus(
  currentStatus: BookingStatus,
  clickedStepIndex: number
): BookingStatus | null {
  if (isTerminalStatus(currentStatus)) return null;

  const currentIndex = STATUS_STEPS.indexOf(currentStatus);
  if (currentIndex === -1) return null;

  if (clickedStepIndex > currentIndex) {
    return STATUS_STEPS[clickedStepIndex] ?? null;
  }

  // Backward or self: uncheck the clicked step → go one step before it
  if (clickedStepIndex === 0 && currentIndex === 0) return null;
  return STATUS_STEPS[Math.max(clickedStepIndex - 1, 0)] ?? null;
}
