"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  sendProposal,
  addDealRoomQuestion,
  deleteDealRoomQuestion,
  sendDealRoomLink,
} from "@/lib/actions/deal-room"
import type { DealRoomProposal, DealRoomCounterOffer, DealRoomQuestionWithAnswer } from "@/lib/types/deal-room"
import type { PackageVersion } from "@/lib/types/database"
import type { BookingService } from "@/lib/types/services"

// ─── Line item builder ────────────────────────────────────────────────────────

function LineItemRow({
  item,
  onRemove,
  onChange,
}: {
  item: { name: string; price: number; is_base: boolean }
  onRemove: () => void
  onChange: (field: "name" | "price", value: string | number) => void
}) {
  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Service name"
        value={item.name}
        onChange={(e) => onChange("name", e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Price"
        value={item.price || ""}
        onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
        className="w-28"
      />
      {!item.is_base && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          ×
        </Button>
      )}
    </div>
  )
}

// ─── Send proposal form ───────────────────────────────────────────────────────

function buildInitialLineItems(
  packageVersion: PackageVersion | null,
  bookingServices: BookingService[]
): { name: string; price: number; is_base: boolean }[] {
  const base = {
    name: packageVersion?.version_name ?? "",
    price: packageVersion?.base_price ?? 0,
    is_base: true,
  }
  const extras = bookingServices.map((s) => ({
    name: s.name_snapshot,
    price: s.unit_price_snapshot * s.quantity,
    is_base: false,
  }))
  return [base, ...extras]
}

function SendProposalForm({
  bookingId,
  onSent,
  packageVersion,
  bookingServices,
}: {
  bookingId: string
  onSent: () => void
  packageVersion: PackageVersion | null
  bookingServices: BookingService[]
}) {
  const [packageName, setPackageName] = useState(packageVersion?.version_name ?? "")
  const [allowRenegotiation, setAllowRenegotiation] = useState(false)
  const [lineItems, setLineItems] = useState(() =>
    buildInitialLineItems(packageVersion, bookingServices)
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function addItem() {
    setLineItems((prev) => [...prev, { name: "", price: 0, is_base: false }])
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: "name" | "price", value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function handleSend() {
    setError(null)
    const validItems = lineItems.filter((i) => i.name.trim())
    if (!packageName.trim() || validItems.length === 0) {
      setError("Please fill in the package name and at least one line item.")
      return
    }
    startTransition(async () => {
      try {
        await sendProposal({
          bookingId,
          packageName: packageName.trim(),
          lineItems: validItems,
          allowRenegotiation,
        })
        onSent()
      } catch {
        setError("Failed to send proposal. Please try again.")
      }
    })
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Package name (e.g. Full Day Coverage)"
        value={packageName}
        onChange={(e) => setPackageName(e.target.value)}
      />

      <div className="space-y-2">
        {lineItems.map((item, i) => (
          <LineItemRow
            key={i}
            item={item}
            onRemove={() => removeItem(i)}
            onChange={(field, value) => updateItem(i, field, value)}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          + Add service
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowRenegotiation}
          onChange={(e) => setAllowRenegotiation(e.target.checked)}
          className="h-4 w-4"
        />
        Allow client to counter-offer
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSend} disabled={isPending} size="sm">
        {isPending ? "Sending…" : "Send proposal"}
      </Button>
    </div>
  )
}

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
  packageVersion,
  bookingServices,
}: {
  bookingId: string
  clientToken: string
  clientEmail: string | null
  proposal: DealRoomProposal | null
  counterOffer: DealRoomCounterOffer | null
  questions: DealRoomQuestionWithAnswer[]
  packageVersion: PackageVersion | null
  bookingServices: BookingService[]
}) {
  const [showSendForm, setShowSendForm] = useState(false)
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

      {/* Proposal section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Proposal
        </p>

        {!proposal && !showSendForm && (
          <Button size="sm" onClick={() => setShowSendForm(true)}>
            Send proposal
          </Button>
        )}

        {showSendForm && (
          <SendProposalForm bookingId={bookingId} onSent={() => setShowSendForm(false)} packageVersion={packageVersion} bookingServices={bookingServices} />
        )}

        {proposal && proposal.status === "sent" && (
          <div className="text-sm text-muted-foreground">
            Proposal sent — awaiting client response.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => setShowSendForm(true)}>
                Send revised proposal
              </Button>
            </div>
          </div>
        )}

        {proposal && proposal.status === "countered" && counterOffer && (
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
            <Button size="sm" variant="outline" onClick={() => setShowSendForm(true)}>
              Send revised proposal
            </Button>
          </div>
        )}

        {proposal && proposal.status === "accepted" && (
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Client accepted the proposal
          </div>
        )}
      </div>

      {/* Q&A section — always visible so photographer can prepare questions early */}
      <QuestionManager bookingId={bookingId} questions={questions} />
    </div>
  )
}
