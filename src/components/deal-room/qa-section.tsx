"use client"

import { useState, useTransition } from "react"
import { saveClientAnswer } from "@/lib/actions/deal-room"
import type { DealRoomQuestionWithAnswer } from "@/lib/types/deal-room"

function QuestionItem({
  question,
  bookingId,
  token,
}: {
  question: DealRoomQuestionWithAnswer
  bookingId: string
  token: string
}) {
  const [value, setValue] = useState(question.answer?.answer_text ?? "")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!value.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await saveClientAnswer({
          bookingId,
          token,
          questionId: question.id,
          answerText: value,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch {
        setError("Failed to save. Please try again.")
      }
    })
  }

  return (
    <div>
      <p className="text-sm text-foreground leading-relaxed mb-3">
        {question.question_text}
      </p>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        onBlur={handleSave}
        rows={2}
        placeholder="Your answer…"
        className="w-full text-sm bg-transparent border-b border-border py-1.5 outline-none resize-none placeholder:text-muted-foreground/40 focus:border-foreground transition-colors leading-relaxed"
      />
      <div className="flex items-center gap-3 mt-2 h-4">
        {isPending && (
          <span className="text-[10px] text-muted-foreground/60 tracking-wide">
            Saving…
          </span>
        )}
        {saved && !isPending && (
          <span className="text-[10px] tracking-wide" style={{ color: "var(--color-primary)" }}>
            Saved
          </span>
        )}
        {error && (
          <span className="text-[10px] text-destructive">{error}</span>
        )}
      </div>
    </div>
  )
}

export function QASection({
  bookingId,
  token,
  questions,
}: {
  bookingId: string
  token: string
  questions: DealRoomQuestionWithAnswer[]
}) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-8">
        A few questions
      </h2>
      <div className="space-y-8">
        {questions.map((q, index) => (
          <div key={q.id}>
            <QuestionItem question={q} bookingId={bookingId} token={token} />
            {index < questions.length - 1 && (
              <div className="h-px bg-border mt-8" />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
