import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type {
  DealRoomData,
  DealRoomProposal,
  DealRoomCounterOffer,
  DealRoomQuestionWithAnswer,
  ProposalLineItem,
} from "@/lib/types/deal-room"

export async function getDealRoomData(
  bookingId: string
): Promise<DealRoomData | null> {
  // Cast to any: Supabase TypeScript generics don't handle partial selects / new tables well
  const supabase = createServiceRoleClient() as any

  const [bookingRes, answersRes, proposalRes, questionsRes, itineraryRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, photographer_id, client_name_primary, client_name_secondary, client_email, event_date, venue_name, client_token"
        )
        .eq("id", bookingId)
        .single(),

      supabase
        .from("booking_inquiry_answers")
        .select("question_text, answer_value, sort_order")
        .eq("booking_id", bookingId)
        .order("sort_order"),

      supabase
        .from("deal_room_proposals")
        .select("*")
        .eq("booking_id", bookingId)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("deal_room_questions")
        .select("*, deal_room_answers(*)")
        .eq("booking_id", bookingId)
        .order("sort_order"),

      supabase
        .from("booking_itinerary_stops")
        .select("id, name, address, start_time, notes, sort_order, created_by")
        .eq("booking_id", bookingId)
        .order("sort_order"),
    ])

  if (bookingRes.error || !bookingRes.data) return null

  const proposal: DealRoomProposal | null = proposalRes.data
    ? { ...proposalRes.data, line_items: proposalRes.data.line_items as ProposalLineItem[] }
    : null

  let counterOffer: DealRoomCounterOffer | null = null
  if (proposal?.status === "countered") {
    const { data } = await supabase
      .from("deal_room_counter_offers")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      counterOffer = { ...data, removed_item_names: data.removed_item_names as string[] }
    }
  }

  const questions: DealRoomQuestionWithAnswer[] = (questionsRes.data ?? []).map((q: any) => ({
    ...q,
    answer:
      Array.isArray(q.deal_room_answers) && q.deal_room_answers.length > 0
        ? q.deal_room_answers[0]
        : null,
  }))

  return {
    booking: bookingRes.data,
    inquiryAnswers: answersRes.data ?? [],
    proposal,
    counterOffer,
    questions,
    itineraryStops: (itineraryRes.data ?? []).map((s: any) => ({
      ...s,
      created_by: (s.created_by ?? "photographer") as "photographer" | "client",
    })),
  }
}
