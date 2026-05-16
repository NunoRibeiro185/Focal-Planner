"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  addDealRoomQuestion,
  deleteDealRoomQuestion,
  sendDealRoomLink,
} from "@/lib/actions/deal-room"
import type { DealRoomProposal, DealRoomCounterOffer, DealRoomQuestionWithAnswer } from "@/lib/types/deal-room"

// ─── Q&A manager ─────────────────────────────────────────────────────────────

function QuestionManager({
  bookingId,
  questions,
}: {
  bookingId: string
  questions: DealRoomQuestionWithAnswer[]
}) {
  const [newQuestion, setNewQuestion] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!newQuestion.trim()) return
    startTransition(async () => {
      await addDealRoomQuestion({ bookingId, questionText: newQuestion.trim() })
      setNewQuestion("")
    })
  }

  function handleDelete(questionId: string) {
    startTransition(async () => {
      await deleteDealRoomQuestion({ questionId, bookingId })
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Questions for your client
      </h3>

      {questions.map((q) => (
        <div key={q.id} className="rounded-md border p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">{q.question_text}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground"
              onClick={() => handleDelete(q.id)}
            >
              ×
            </Button>
          </div>
          {q.answer && (
            <p className="text-xs text-muted-foreground border-t pt-1">
              {q.answer.answer_text}
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="Add a question…"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={isPending || !newQuestion.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ClientPortalPanel({
  bookingId,
  clientToken,
  clientEmail,
  proposal,
  counterOffer,
  questions,
}: {
  bookingId: string
  clientToken: string
  clientEmail: string | null
  proposal: DealRoomProposal | null
  counterOffer: DealRoomCounterOffer | null
  questions: DealRoomQuestionWithAnswer[]
}) {
  const [linkSent, setLinkSent] = useState(false)
  const [isSendingLink, startSendLink] = useTransition()

  const dealRoomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/client/${bookingId}?token=${clientToken}`
      : `/client/${bookingId}?token=${clientToken}`

  function copyLink() {
    navigator.clipboard.writeText(dealRoomUrl)
  }

  function handleSendLink() {
    startSendLink(async () => {
      await sendDealRoomLink(bookingId)
      setLinkSent(true)
      setTimeout(() => setLinkSent(false), 3000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Deal room link */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client portal link
        </p>
        <div className="flex gap-2">
          <Input value={dealRoomUrl} readOnly className="text-xs" />
          <Button variant="outline" size="sm" onClick={copyLink}>
            Copy
          </Button>
        </div>
        {clientEmail && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendLink}
            disabled={isSendingLink}
          >
            {isSendingLink ? "Sending…" : linkSent ? "Sent!" : "Email link to client"}
          </Button>
        )}
      </div>

      {/* Proposal status */}
      {proposal && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proposal
          </p>

          {proposal.status === "sent" && (
            <p className="text-sm text-muted-foreground">
              Proposal sent — awaiting client response.
            </p>
          )}

          {proposal.status === "countered" && counterOffer && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Client sent a counter-offer
              </p>
              <p className="text-muted-foreground">
                Removed: {counterOffer.removed_item_names.join(", ")}
              </p>
              <p className="text-muted-foreground">
                Proposed total: {counterOffer.proposed_total.toLocaleString()}
              </p>
            </div>
          )}

          {proposal.status === "accepted" && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ Client accepted the proposal
            </p>
          )}
        </div>
      )}

      {/* Q&A section — always visible so photographer can prepare questions early */}
      <QuestionManager bookingId={bookingId} questions={questions} />
    </div>
  )
}
