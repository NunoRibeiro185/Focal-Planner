"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/booking-section"
import { formatCurrency } from "@/lib/utils/currency"
import {
  addDealRoomQuestion,
  deleteDealRoomQuestion,
  sendDealRoomLink,
  acceptCounterOffer,
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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Questions for your client
      </p>

      {questions.length > 0 && (
        <div>
          {questions.map((q) => (
            <div key={q.id} className="group flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
              <div className="flex-1 space-y-0.5">
                <p className="text-sm">{q.question_text}</p>
                {q.answer && (
                  <p className="text-xs text-muted-foreground">{q.answer.answer_text}</p>
                )}
              </div>
              <button
                className="mt-0.5 text-base leading-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                onClick={() => handleDelete(q.id)}
                aria-label="Remove question"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a question…"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="text-sm"
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
  currency,
}: {
  bookingId: string
  clientToken: string
  clientEmail: string | null
  proposal: DealRoomProposal | null
  counterOffer: DealRoomCounterOffer | null
  questions: DealRoomQuestionWithAnswer[]
  currency: string
}) {
  const [linkSent, setLinkSent] = useState(false)
  const [isSendingLink, startSendLink] = useTransition()
  const [isAccepting, startAccept] = useTransition()

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

  function handleAcceptCounter() {
    startAccept(async () => {
      await acceptCounterOffer(bookingId)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Client portal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compact link row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyLink}>
            Copy link
          </Button>
          {clientEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendLink}
              disabled={isSendingLink}
            >
              {isSendingLink ? "Sending…" : linkSent ? "Sent!" : "Email to client"}
            </Button>
          )}
        </div>

        {/* Counter-offer with action */}
        {proposal?.status === "countered" && counterOffer && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Counter-offer received
            </p>
            <div className="space-y-1 text-sm">
              <p>
                Remove:{" "}
                <span className="font-medium">{counterOffer.removed_item_names.join(", ")}</span>
              </p>
              <p>
                Proposed total:{" "}
                <span className="font-medium">{formatCurrency(counterOffer.proposed_total, currency)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <Button size="sm" onClick={handleAcceptCounter} disabled={isAccepting}>
                {isAccepting ? "Accepting…" : "Accept terms"}
              </Button>
              <span className="text-xs text-muted-foreground">
                or send a revised proposal above
              </span>
            </div>
          </div>
        )}

        {/* Awaiting response */}
        {proposal?.status === "sent" && (
          <p className="text-sm text-muted-foreground">
            Proposal sent — awaiting client response.
          </p>
        )}

        {/* Accepted */}
        {proposal?.status === "accepted" && (
          <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            ✓ Client accepted the proposal
          </p>
        )}

        {/* Q&A */}
        <QuestionManager bookingId={bookingId} questions={questions} />
      </CardContent>
    </Card>
  )
}
