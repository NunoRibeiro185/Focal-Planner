import type { DealRoomData } from "@/lib/types/deal-room"
import { ProposalView } from "./proposal-view"
import { ItinerarySection } from "./itinerary-section"
import { QASection } from "./qa-section"

type SafeBooking = Omit<DealRoomData["booking"], "client_token" | "photographer_id">
type SafeDealRoomData = Omit<DealRoomData, "booking"> & { booking: SafeBooking }

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function ClientDealRoomView({
  data,
  token,
}: {
  data: SafeDealRoomData
  token: string
}) {
  const { booking, inquiryAnswers, proposal, counterOffer, questions, itineraryStops } = data
  const isPostBooking = proposal?.status === "accepted"

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">{booking.client_name_primary}</h1>
          {booking.event_date && (
            <p className="text-sm text-muted-foreground">{formatDate(booking.event_date)}</p>
          )}
          {booking.venue_name && (
            <p className="text-sm text-muted-foreground">{booking.venue_name}</p>
          )}
        </div>

        {/* Post-booking: confirmed badge */}
        {isPostBooking && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 text-center">
            Booking confirmed
          </div>
        )}

        {/* Inquiry summary */}
        {inquiryAnswers.length > 0 && (
          <section className="rounded-lg border p-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your Inquiry
            </h2>
            {inquiryAnswers.map((a, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground">{a.question_text}</p>
                <p className="text-sm">{a.answer_value}</p>
              </div>
            ))}
          </section>
        )}

        {/* Proposal or post-booking agreed package */}
        {proposal && (
          <ProposalView
            proposal={proposal}
            counterOffer={counterOffer}
            bookingId={booking.id}
            token={token}
          />
        )}

        {!proposal && (
          <section className="rounded-lg border p-4 text-sm text-muted-foreground text-center">
            Your proposal is being prepared — you&apos;ll receive an email when it&apos;s ready.
          </section>
        )}

        {/* Post-booking sections */}
        {isPostBooking && (
          <>
            <ItinerarySection
              bookingId={booking.id}
              token={token}
              stops={itineraryStops}
            />
            {questions.length > 0 && (
              <QASection
                bookingId={booking.id}
                token={token}
                questions={questions}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
