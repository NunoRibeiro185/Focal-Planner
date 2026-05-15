"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Itinerary
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            + Add stop
          </button>
        )}
      </div>

      {stops.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No stops yet. Add one to share your schedule.</p>
      )}

      {stops.map((stop) => (
        <div key={stop.id} className="rounded-md bg-muted/50 px-3 py-2">
          <div className="flex items-baseline gap-2">
            {stop.start_time && (
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                {stop.start_time.slice(0, 5)}
              </span>
            )}
            <span className="text-sm font-medium">{stop.name}</span>
            {stop.created_by === "client" && (
              <span className="text-xs text-muted-foreground ml-auto">added by you</span>
            )}
          </div>
          {stop.address && (
            <p className={`text-xs text-muted-foreground mt-0.5 ${stop.start_time ? "ml-14" : ""}`}>{stop.address}</p>
          )}
          {stop.notes && (
            <p className={`text-xs text-muted-foreground mt-0.5 ${stop.start_time ? "ml-14" : ""}`}>{stop.notes}</p>
          )}
        </div>
      ))}

      {showForm && (
        <div className="space-y-2 pt-1">
          <Input
            placeholder="Stop name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            type="time"
            placeholder="Time (optional)"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !name.trim()}
            >
              {isPending ? "Adding…" : "Add stop"}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
