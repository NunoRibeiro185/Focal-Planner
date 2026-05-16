"use client"

import { useState, useTransition } from "react"
import { addClientItineraryStop } from "@/lib/actions/deal-room"
import type { DealRoomItineraryStop } from "@/lib/types/deal-room"

export function ItinerarySection({
  bookingId,
  token,
  stops,
}: {
  bookingId: string
  token: string
  stops: DealRoomItineraryStop[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [startTime, setStartTime] = useState("")
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await addClientItineraryStop({
          bookingId,
          token,
          name: name.trim(),
          address: address.trim() || null,
          startTime: startTime || null,
          notes: notes.trim() || null,
        })
        setName("")
        setAddress("")
        setStartTime("")
        setNotes("")
        setShowForm(false)
      } catch {
        setError("Failed to add stop. Please try again.")
      }
    })
  }

  return (
    <section>
      <h2 className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-8">
        Your day
      </h2>

      {stops.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[52ch] mb-8">
          No stops yet. Your photographer will add the key moments — you can add yours here too.
        </p>
      )}

      {/* Timeline */}
      {stops.length > 0 && (
        <div className="space-y-6 mb-8">
          {stops.map((stop, index) => (
            <div key={stop.id}>
              <div className="grid gap-x-5" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
                <span className="text-xs text-muted-foreground tabular-nums pt-0.5 text-right">
                  {stop.start_time ? stop.start_time.slice(0, 5) : ""}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {stop.name}
                  </p>
                  {stop.address && (
                    <p className="text-xs text-muted-foreground mt-1">{stop.address}</p>
                  )}
                  {stop.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{stop.notes}</p>
                  )}
                  {stop.created_by === "client" && (
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5 tracking-wide">
                      added by you
                    </p>
                  )}
                </div>
              </div>
              {index < stops.length - 1 && (
                <div className="grid gap-x-5 mt-1" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
                  <div />
                  <div className="h-px bg-border mt-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add stop form */}
      {showForm ? (
        <div
          className="grid gap-x-5 mt-4"
          style={{ gridTemplateColumns: "3.5rem 1fr" }}
        >
          <div />
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Stop name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm bg-transparent border-b border-border py-1.5 outline-none placeholder:text-muted-foreground/50 focus:border-foreground transition-colors"
            />
            <div className="flex gap-3">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm bg-transparent border-b border-border py-1.5 outline-none text-foreground focus:border-foreground transition-colors w-28"
              />
              <input
                type="text"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1 text-sm bg-transparent border-b border-border py-1.5 outline-none placeholder:text-muted-foreground/50 focus:border-foreground transition-colors"
              />
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm bg-transparent border-b border-border py-1.5 outline-none placeholder:text-muted-foreground/50 focus:border-foreground transition-colors"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-5 pt-1">
              <button
                onClick={handleAdd}
                disabled={isPending || !name.trim()}
                className="text-sm font-medium text-foreground disabled:opacity-40 transition-opacity"
              >
                {isPending ? "Adding…" : "Add stop"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setName("")
                  setAddress("")
                  setStartTime("")
                  setNotes("")
                  setError(null)
                }}
                disabled={isPending}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          + Add a stop
        </button>
      )}
    </section>
  )
}
