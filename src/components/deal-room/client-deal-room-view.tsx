import type { DealRoomData } from "@/lib/types/deal-room"
import { ProposalView } from "./proposal-view"
import { ItinerarySection } from "./itinerary-section"
import { QASection } from "./qa-section"

type SafeBooking = Omit<DealRoomData["booking"], "client_token" | "photographer_id">
type SafeDealRoomData = Omit<DealRoomData, "booking"> & { booking: SafeBooking }

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function stageBg(proposal: DealRoomData["proposal"]) {
  if (!proposal) return "oklch(0.99 0.005 85)"
  if (proposal.status === "accepted") return "oklch(0.955 0.022 74)"
  return "oklch(0.975 0.010 80)"
}

function stageLabel(proposal: DealRoomData["proposal"]) {
  if (!proposal) return "Proposal incoming"
  if (proposal.status === "accepted") return "Booking confirmed"
  if (proposal.status === "countered") return "Counter-offer sent"
  return "Proposal ready"
}

function stageDotColor(proposal: DealRoomData["proposal"]) {
  if (proposal?.status === "accepted") return "oklch(0.52 0.12 55)"
  return "oklch(0.70 0.03 75)"
}

export function ClientDealRoomView({
  data,
  token,
}: {
  data: SafeDealRoomData
  token: string
}) {
  const {
    booking,
    inquiryAnswers,
    proposal,
    counterOffer,
    questions,
    itineraryStops,
    photographerName,
    currency,
  } = data
  const isPostBooking = proposal?.status === "accepted"
  const clientName = booking.client_name_secondary
    ? `${booking.client_name_primary} & ${booking.client_name_secondary}`
    : booking.client_name_primary

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: stageBg(proposal),
        transition: "background-color 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="mx-auto max-w-[680px] px-6 pt-14 pb-32">

        {/* Photographer byline */}
        {photographerName && (
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-10">
            {photographerName}
          </p>
        )}

        {/* Stage indicator */}
        <div className="flex items-center gap-2.5 mb-10">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: stageDotColor(proposal) }}
          />
          <span className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            {stageLabel(proposal)}
          </span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <h1
            className="font-heading leading-[1.1] tracking-tight text-foreground mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)" }}
          >
            {clientName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {booking.event_date && (
              <span>{formatDate(booking.event_date)}</span>
            )}
            {booking.event_date && booking.venue_name && (
              <span aria-hidden className="opacity-40">·</span>
            )}
            {booking.venue_name && (
              <span>{booking.venue_name}</span>
            )}
          </div>
        </header>

        {/* Rule */}
        <div className="h-px bg-border mb-14" />

        {/* Proposal */}
        {proposal ? (
          <ProposalView
            proposal={proposal}
            counterOffer={counterOffer}
            bookingId={booking.id}
            token={token}
            currency={currency}
          />
        ) : (
          <section className="mb-14">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[55ch]">
              Your proposal is being put together. You'll receive an email as soon as it's ready to review.
            </p>
          </section>
        )}

        {/* Post-booking collaboration sections */}
        {isPostBooking && (
          <>
            <div className="h-px bg-border mt-16 mb-14" />
            <ItinerarySection
              bookingId={booking.id}
              token={token}
              stops={itineraryStops}
            />

            {questions.length > 0 && (
              <>
                <div className="h-px bg-border mt-16 mb-14" />
                <QASection
                  bookingId={booking.id}
                  token={token}
                  questions={questions}
                />
              </>
            )}
          </>
        )}

        {/* Inquiry recap — historical context, always at bottom */}
        {inquiryAnswers.length > 0 && (
          <>
            <div className="h-px bg-border mt-16 mb-14" />
            <section>
              <h2 className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-8">
                Your inquiry
              </h2>
              <dl className="space-y-5">
                {inquiryAnswers.map((a, i) => (
                  <div key={i}>
                    <dt className="text-xs text-muted-foreground mb-1">{a.question_text}</dt>
                    <dd className="text-sm text-foreground leading-relaxed">{a.answer_value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}

      </div>
    </div>
  )
}
