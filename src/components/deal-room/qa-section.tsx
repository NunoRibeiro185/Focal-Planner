"use client"

import { useState, useTransition } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await saveClientAnswer({
        bookingId,
        token,
        questionId: question.id,
        answerText: value,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm">{question.question_text}</p>
      <Textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        rows={2}
        placeholder="Your answer…"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
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
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Questions from your photographer
      </h2>
      {questions.map((q) => (
        <QuestionItem key={q.id} question={q} bookingId={bookingId} token={token} />
      ))}
    </section>
  )
}
