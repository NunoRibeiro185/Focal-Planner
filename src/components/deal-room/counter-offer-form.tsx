"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { submitCounterOffer } from "@/lib/actions/deal-room"
import { computeCounterTotal } from "@/lib/utils/deal-room-proposals"
import type { ProposalLineItem } from "@/lib/types/deal-room"

export function CounterOfferForm({
  proposalId,
  bookingId,
  token,
  lineItems,
  onCancel,
}: {
  proposalId: string
  bookingId: string
  token: string
  lineItems: ProposalLineItem[]
  onCancel: () => void
}) {
  const removableItems = lineItems.filter((i) => !i.is_base)
  const [removedNames, setRemovedNames] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const proposedTotal = computeCounterTotal(lineItems, removedNames)

  function toggle(name: string) {
    setRemovedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  function handleSubmit() {
    if (removedNames.length === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await submitCounterOffer({ bookingId, token, proposalId, removedItemNames: removedNames, proposedTotal })
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select the add-ons you&apos;d like to remove:
      </p>

      {removableItems.map((item) => (
        <label
          key={item.name}
          className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={removedNames.includes(item.name)}
              onChange={() => toggle(item.name)}
              className="h-4 w-4"
            />
            <span className="text-sm">{item.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            +{item.price.toLocaleString()}
          </span>
        </label>
      ))}

      <div className="flex justify-between text-sm font-medium pt-1 border-t">
        <span>Proposed total</span>
        <span>{proposedTotal.toLocaleString()}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || removedNames.length === 0}
        >
          {isPending ? "Sending…" : "Send counter-offer"}
        </Button>
      </div>
    </div>
  )
}
