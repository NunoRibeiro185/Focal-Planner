"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { acceptProposal } from "@/lib/actions/deal-room"
import { canClientCounterOffer } from "@/lib/utils/deal-room-proposals"
import { CounterOfferForm } from "./counter-offer-form"
import type { DealRoomProposal, DealRoomCounterOffer } from "@/lib/types/deal-room"

export function ProposalView({
  proposal,
  counterOffer,
  bookingId,
  token,
}: {
  proposal: DealRoomProposal
  counterOffer: DealRoomCounterOffer | null
  bookingId: string
  token: string
}) {
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isAccepted = proposal.status === "accepted"
  const isCountered = proposal.status === "countered"
  const canCounter = canClientCounterOffer(proposal)

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      try {
        await acceptProposal({ bookingId, token, proposalId: proposal.id })
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          {isAccepted ? "Agreed Package" : "Proposal"}
        </h2>
        <p className="font-medium">{proposal.package_name}</p>
      </div>

      <div className="space-y-1">
        {proposal.line_items.map((item) => (
          <div
            key={item.name}
            className="flex justify-between text-sm"
          >
            <span className={item.is_base ? "font-medium" : "text-muted-foreground"}>
              {item.name}
            </span>
            <span>{item.price.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold pt-2 border-t">
          <span>{isAccepted ? "Total agreed" : "Total"}</span>
          <span>{proposal.total_price.toLocaleString()}</span>
        </div>
      </div>

      {/* Counter-offer sent state */}
      {isCountered && counterOffer && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Counter-offer sent — waiting for the photographer&apos;s response.
          <br />
          Removed: {counterOffer.removed_item_names.join(", ")}
          <br />
          Proposed total: {counterOffer.proposed_total.toLocaleString()}
        </div>
      )}

      {/* Actions — only when status is sent */}
      {proposal.status === "sent" && !showCounterForm && (
        <div className="flex gap-2">
          <Button onClick={handleAccept} disabled={isPending} size="sm">
            {isPending ? "Accepting…" : "Accept"}
          </Button>
          {canCounter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCounterForm(true)}
            >
              Counter-offer
            </Button>
          )}
        </div>
      )}

      {showCounterForm && (
        <CounterOfferForm
          proposalId={proposal.id}
          bookingId={bookingId}
          token={token}
          lineItems={proposal.line_items}
          onCancel={() => setShowCounterForm(false)}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
