import { describe, it, expect } from "vitest"
import { computeNextSortOrder, unansweredCount } from "@/lib/utils/deal-room-qa"

describe("computeNextSortOrder", () => {
  it("returns 0 for an empty list", () => {
    expect(computeNextSortOrder([])).toBe(0)
  })

  it("returns max sort_order + 1", () => {
    expect(computeNextSortOrder([{ sort_order: 0 }, { sort_order: 2 }, { sort_order: 1 }])).toBe(3)
  })

  it("handles a single question", () => {
    expect(computeNextSortOrder([{ sort_order: 5 }])).toBe(6)
  })
})

describe("unansweredCount", () => {
  it("returns 0 when all questions have answers", () => {
    const questions = [
      { answer: { answer_text: "Ed Sheeran - Perfect" } },
      { answer: { answer_text: "Grandma Rosa" } },
    ]
    expect(unansweredCount(questions)).toBe(0)
  })

  it("counts questions with null answers", () => {
    const questions = [
      { answer: null },
      { answer: { answer_text: "Some answer" } },
    ]
    expect(unansweredCount(questions)).toBe(1)
  })

  it("counts questions with blank string answers", () => {
    const questions = [
      { answer: { answer_text: "" } },
      { answer: { answer_text: "  " } },
    ]
    expect(unansweredCount(questions)).toBe(2)
  })

  it("returns 0 for an empty list", () => {
    expect(unansweredCount([])).toBe(0)
  })
})
