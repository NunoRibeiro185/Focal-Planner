"use client"

import { useState, useTransition } from "react"
import { acceptProposal, submitCounterOffer } from "@/lib/actions/deal-room"
import { canClientCounterOffer, computeCounterTotal } from "@/lib/utils/deal-room-proposals"
import { formatCurrency } from "@/lib/utils/currency"
import type { DealRoomProposal, DealRoomCounterOffer } from "@/lib/types/deal-room"

export function ProposalView({
  proposal,
  counterOffer,
  bookingId,
  token,
  currency,
}: {
  proposal: DealRoomProposal
  counterOffer: DealRoomCounterOffer | null
  bookingId: string
  token: string
  currency: string
}) {
  const [mode, setMode] = useState<"view" | "counter">("view")
  const [removedNames, setRemovedNames] = useState<string[]>([])
  const [acceptPending, startAcceptTransition] = useTransition()
  const [counterPending, startCounterTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isAccepted = proposal.status === "accepted"
  const isCountered = proposal.status === "countered"
  const isSent = proposal.status === "sent"
  const canCounter = canClientCounterOffer(proposal)

  const baseItems = proposal.line_items.filter((i) => i.is_base)
  const addOns = proposal.line_items.filter((i) => !i.is_base)
  const proposedTotal = computeCounterTotal(proposal.line_items, removedNames)

  function toggleRemove(name: string) {
    setRemovedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  function handleAccept() {
    setError(null)
    startAcceptTransition(async () => {
      try {
        await acceptProposal({ bookingId, token, proposalId: proposal.id })
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  function handleCounterSubmit() {
    if (removedNames.length === 0) return
    setError(null)
    startCounterTransition(async () => {
      try {
        await submitCounterOffer({
          bookingId,
          token,
          proposalId: proposal.id,
          removedItemNames: removedNames,
          proposedTotal,
        })
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <section>
      <h2 className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-8">
        {isAccepted ? "Agreed package" : "Your proposal"}
      </h2>

      <p className="font-heading text-2xl text-foreground mb-10 leading-snug">
        {proposal.package_name}
      </p>

      {/* Base items */}
      {baseItems.length > 0 && (
        <div className="space-y-3 mb-6">
          {baseItems.map((item) => (
            <div key={item.name} className="flex justify-between items-baseline gap-6">
              <span className="text-sm text-foreground">{item.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                {formatCurrency(item.price, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add-ons */}
      {addOns.length > 0 && (
        <>
          {baseItems.length > 0 && <div className="h-px bg-border mb-5" />}
          <div className="space-y-3 mb-6">
            <p className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-4">
              Add-ons
            </p>
            {addOns.map((item) => {
              const isRemoved = removedNames.includes(item.name)
              return (
                <div
                  key={item.name}
                  className="flex justify-between items-center gap-4"
                  style={{
                    opacity: isRemoved ? 0.35 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <span
                    className="text-sm"
                    style={{
                      textDecoration: isRemoved ? "line-through" : "none",
                      color: isRemoved
                        ? "var(--color-muted-foreground)"
                        : "var(--color-foreground)",
                    }}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-sm tabular-nums"
                      style={{
                        textDecoration: isRemoved ? "line-through" : "none",
                        color: "var(--color-muted-foreground)",
                      }}
                    >
                      {formatCurrency(item.price, currency)}
                    </span>
                    {mode === "counter" && (
                      <button
                        onClick={() => toggleRemove(item.name)}
                        aria-label={isRemoved ? `Restore ${item.name}` : `Remove ${item.name}`}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm leading-none shrink-0"
                        style={{ fontFamily: "inherit" }}
                      >
                        {isRemoved ? "+" : "×"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Total */}
      <div className="h-px bg-border mb-5" />
      <div className="flex justify-between items-baseline mb-12">
        <span className="text-sm text-foreground">
          {isAccepted
            ? "Agreed total"
            : mode === "counter"
            ? "Proposed total"
            : "Total"}
        </span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatCurrency(
            mode === "counter" ? proposedTotal : proposal.total_price,
            currency
          )}
        </span>
      </div>

      {/* Counter-offer waiting state */}
      {isCountered && (
        <div className="mb-2 space-y-2">
          <p className="text-sm text-foreground">Your counter-offer has been sent.</p>
          {counterOffer && (
            <p className="text-sm text-muted-foreground">
              Removed:{" "}
              {counterOffer.removed_item_names.join(", ")}
              {" · "}
              Proposed total: {formatCurrency(counterOffer.proposed_total, currency)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            You'll hear back as soon as they respond.
          </p>
        </div>
      )}

      {/* Actions — sent + view mode */}
      {isSent && mode === "view" && (
        <div className="space-y-4">
          <button
            onClick={handleAccept}
            disabled={acceptPending}
            className="w-full py-4 px-8 text-sm font-medium tracking-wide rounded-sm transition-opacity"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
              opacity: acceptPending ? 0.6 : 1,
            }}
          >
            {acceptPending ? "Agreeing…" : "Agree to budget →"}
          </button>

          {canCounter && (
            <p className="text-center">
              <button
                onClick={() => setMode("counter")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Request adjustments
              </button>
            </p>
          )}
        </div>
      )}

      {/* Actions — sent + counter mode */}
      {isSent && mode === "counter" && (
        <div className="space-y-4">
          <button
            onClick={handleCounterSubmit}
            disabled={counterPending || removedNames.length === 0}
            className="w-full py-3 px-8 text-sm font-medium tracking-wide rounded-sm transition-opacity"
            style={{
              backgroundColor: "var(--color-foreground)",
              color: "var(--color-background)",
              opacity: counterPending || removedNames.length === 0 ? 0.4 : 1,
            }}
          >
            {counterPending ? "Sending…" : "Send counter-offer"}
          </button>
          <p className="text-center">
            <button
              onClick={() => {
                setMode("view")
                setRemovedNames([])
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Accepted confirmation */}
      {isAccepted && (
        <p
          className="text-xs tracking-[0.12em] uppercase"
          style={{ color: "var(--color-primary)" }}
        >
          Budget agreed
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}
    </section>
  )
}
