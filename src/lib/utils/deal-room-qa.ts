export function computeNextSortOrder(questions: { sort_order: number }[]): number {
  if (questions.length === 0) return 0
  return Math.max(...questions.map((q) => q.sort_order)) + 1
}

export function unansweredCount(
  questions: { answer: { answer_text: string } | null }[]
): number {
  return questions.filter((q) => !q.answer || !q.answer.answer_text.trim()).length
}
