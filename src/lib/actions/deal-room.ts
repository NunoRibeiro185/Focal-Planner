"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { verifyClientToken } from "@/lib/services/deal-room-access"
import { computeNextSortOrder } from "@/lib/utils/deal-room-qa"
import {
  sendProposalEmail,
  sendProposalAcceptedEmail,
  sendCounterOfferEmail,
  sendItineraryUpdatedEmail,
  sendAnswersSubmittedEmail,
  sendDealRoomLinkEmail,
} from "@/lib/services/deal-room-emails"

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  is_base: z.boolean(),
})

const sendProposalSchema = z.object({
  bookingId: z.string().uuid(),
  packageName: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1),
  allowRenegotiation: z.boolean(),
})

const addQuestionSchema = z.object({
  bookingId: z.string().uuid(),
  questionText: z.string().min(1).max(500),
})

const deleteQuestionSchema = z.object({
  questionId: z.string().uuid(),
  bookingId: z.string().uuid(),
})

const clientTokenBaseSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().uuid(),
})

const acceptProposalSchema = clientTokenBaseSchema.extend({
  proposalId: z.string().uuid(),
})

const counterOfferSchema = clientTokenBaseSchema.extend({
  proposalId: z.string().uuid(),
  removedItemNames: z.array(z.string()).min(1),
  proposedTotal: z.number().nonnegative(),
})

const itineraryStopSchema = clientTokenBaseSchema.extend({
  name: z.string().min(1),
  address: z.string().nullable(),
  startTime: z.string().nullable(),
  notes: z.string().nullable(),
})

const saveAnswerSchema = clientTokenBaseSchema.extend({
  questionId: z.string().uuid(),
  answerText: z.string(),
})

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getOwnedBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const supabaseService = createServiceRoleClient() as any
  const { data: booking, error } = await supabaseService
    .from("bookings")
    .select("id, photographer_id, client_name_primary, client_email, client_token")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single()

  if (error || !booking) throw new Error("Booking not found")
  return { booking, photographerId: user.id as string }
}

async function assertClientToken(bookingId: string, token: string) {
  const supabase = createServiceRoleClient() as any
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, client_name_primary, client_email, photographer_id, client_token")
    .eq("id", bookingId)
    .single()

  if (error || !booking) throw new Error("Booking not found")
  if (!verifyClientToken(booking.client_token, token)) throw new Error("Invalid token")
  return booking as {
    id: string
    client_name_primary: string
    client_email: string | null
    photographer_id: string
    client_token: string
  }
}

async function getPhotographerEmail(photographerId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.auth.admin.getUserById(photographerId)
  return data.user?.email ?? null
}

async function getPhotographerName(photographerId: string): Promise<string> {
  const supabase = createServiceRoleClient() as any
  const { data } = await supabase
    .from("photographers")
    .select("full_name")
    .eq("id", photographerId)
    .single()
  return data?.full_name ?? "Your photographer"
}

// ─── Photographer actions ─────────────────────────────────────────────────────

export async function sendProposal(input: unknown) {
  const { bookingId, packageName, lineItems, allowRenegotiation } =
    sendProposalSchema.parse(input)

  const { booking, photographerId } = await getOwnedBooking(bookingId)

  const totalPrice = lineItems.reduce((sum, item) => sum + item.price, 0)

  const supabase = createServiceRoleClient() as any
  const { error } = await supabase.from("deal_room_proposals").insert({
    booking_id: bookingId,
    photographer_id: photographerId,
    package_name: packageName,
    line_items: lineItems,
    total_price: totalPrice,
    allow_renegotiation: allowRenegotiation,
    status: "sent",
  })
  if (error) throw new Error("Failed to create proposal")

  revalidatePath(`/bookings/${bookingId}`)

  if (booking.client_email) {
    const photographerName = await getPhotographerName(photographerId)
    Promise.resolve().then(() =>
      sendProposalEmail({
        clientEmail: booking.client_email!,
        clientName: booking.client_name_primary,
        photographerName,
        bookingId,
        clientToken: booking.client_token,
      }).catch(console.error)
    )
  }
}

export async function addDealRoomQuestion(input: unknown) {
  const { bookingId, questionText } = addQuestionSchema.parse(input)
  const { photographerId } = await getOwnedBooking(bookingId)

  const supabase = createServiceRoleClient() as any

  const { data: existing } = await supabase
    .from("deal_room_questions")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order")

  const { error } = await supabase.from("deal_room_questions").insert({
    booking_id: bookingId,
    photographer_id: photographerId,
    question_text: questionText,
    sort_order: computeNextSortOrder(existing ?? []),
  })
  if (error) throw new Error("Failed to add question")

  revalidatePath(`/bookings/${bookingId}`)
}

export async function deleteDealRoomQuestion(input: unknown) {
  const { questionId, bookingId } = deleteQuestionSchema.parse(input)
  await getOwnedBooking(bookingId)

  const supabase = createServiceRoleClient() as any
  const { error } = await supabase
    .from("deal_room_questions")
    .delete()
    .eq("id", questionId)
    .eq("booking_id", bookingId)
  if (error) throw new Error("Failed to delete question")

  revalidatePath(`/bookings/${bookingId}`)
}

// ─── Client actions ───────────────────────────────────────────────────────────

export async function acceptProposal(input: unknown) {
  const { bookingId, token, proposalId } = acceptProposalSchema.parse(input)
  const booking = await assertClientToken(bookingId, token)

  const supabase = createServiceRoleClient() as any
  const { data: updated, error } = await supabase
    .from("deal_room_proposals")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("booking_id", bookingId)
    .eq("status", "sent")
    .select("id")
  if (error) throw new Error("Failed to accept proposal")
  if (!updated || updated.length === 0) throw new Error("Proposal is no longer available for acceptance")

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  const photographerEmail = await getPhotographerEmail(booking.photographer_id)
  if (photographerEmail) {
    Promise.resolve().then(() =>
      sendProposalAcceptedEmail({
        photographerEmail,
        clientName: booking.client_name_primary,
        bookingId,
      }).catch(console.error)
    )
  }
}

export async function submitCounterOffer(input: unknown) {
  const { bookingId, token, proposalId, removedItemNames, proposedTotal } =
    counterOfferSchema.parse(input)
  const booking = await assertClientToken(bookingId, token)

  const supabase = createServiceRoleClient() as any

  const { data: updatedProposal, error: proposalError } = await supabase
    .from("deal_room_proposals")
    .update({ status: "countered", responded_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("booking_id", bookingId)
    .eq("status", "sent")
    .select("id")
  if (proposalError) throw new Error("Failed to update proposal")
  if (!updatedProposal || updatedProposal.length === 0) throw new Error("Proposal is no longer available for counter-offer")

  const { error: counterError } = await supabase.from("deal_room_counter_offers").insert({
    proposal_id: proposalId,
    booking_id: bookingId,
    removed_item_names: removedItemNames,
    proposed_total: proposedTotal,
  })
  if (counterError) throw new Error("Failed to save counter-offer")

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  const photographerEmail = await getPhotographerEmail(booking.photographer_id)
  if (photographerEmail) {
    Promise.resolve().then(async () => {
      const { data: photographer } = await supabase
        .from("photographers")
        .select("default_currency")
        .eq("id", booking.photographer_id)
        .single()
      await sendCounterOfferEmail({
        photographerEmail,
        clientName: booking.client_name_primary,
        bookingId,
        removedItems: removedItemNames,
        proposedTotal,
        currency: photographer?.default_currency ?? "€",
      })
    }).catch(console.error)
  }
}

export async function addClientItineraryStop(input: unknown) {
  const { bookingId, token, name, address, startTime, notes } =
    itineraryStopSchema.parse(input)
  const booking = await assertClientToken(bookingId, token)

  const supabase = createServiceRoleClient() as any

  const { data: existing } = await supabase
    .from("booking_itinerary_stops")
    .select("sort_order")
    .eq("booking_id", bookingId)
    .order("sort_order")

  const sortOrder = existing?.length
    ? Math.max(...existing.map((s: { sort_order: number }) => s.sort_order)) + 1
    : 0

  const { error } = await supabase.from("booking_itinerary_stops").insert({
    booking_id: bookingId,
    photographer_id: booking.photographer_id,
    name,
    address,
    start_time: startTime,
    notes,
    sort_order: sortOrder,
    created_by: "client",
  })
  if (error) throw new Error("Failed to add itinerary stop")

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  const photographerEmail = await getPhotographerEmail(booking.photographer_id)
  if (photographerEmail) {
    Promise.resolve().then(() =>
      sendItineraryUpdatedEmail({
        photographerEmail,
        clientName: booking.client_name_primary,
        bookingId,
      }).catch(console.error)
    )
  }
}

export async function saveClientAnswer(input: unknown) {
  const { bookingId, token, questionId, answerText } = saveAnswerSchema.parse(input)
  const booking = await assertClientToken(bookingId, token)

  const supabase = createServiceRoleClient() as any

  const { data: question, error: questionError } = await supabase
    .from("deal_room_questions")
    .select("id")
    .eq("id", questionId)
    .eq("booking_id", bookingId)
    .single()
  if (questionError || !question) throw new Error("Question not found")

  const { error } = await supabase.from("deal_room_answers").upsert(
    {
      question_id: questionId,
      booking_id: bookingId,
      answer_text: answerText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "question_id" }
  )
  if (error) throw new Error("Failed to save answer")

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  const photographerEmail = await getPhotographerEmail(booking.photographer_id)
  if (photographerEmail) {
    Promise.resolve().then(() =>
      sendAnswersSubmittedEmail({
        photographerEmail,
        clientName: booking.client_name_primary,
        bookingId,
      }).catch(console.error)
    )
  }
}

export async function acceptCounterOffer(bookingId: string) {
  await getOwnedBooking(bookingId)
  const supabase = createServiceRoleClient() as any

  // Fetch the current countered proposal and its counter offer to apply negotiated terms
  const { data: proposal, error: proposalFetchError } = await supabase
    .from("deal_room_proposals")
    .select("id, line_items")
    .eq("booking_id", bookingId)
    .eq("status", "countered")
    .single()

  if (proposalFetchError || !proposal) throw new Error("Failed to find countered proposal")

  const { data: counterOffer, error: counterFetchError } = await supabase
    .from("deal_room_counter_offers")
    .select("removed_item_names, proposed_total")
    .eq("proposal_id", proposal.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (counterFetchError || !counterOffer) throw new Error("Failed to find counter offer")

  const updatedLineItems = (proposal.line_items as { name: string }[]).filter(
    (item) => !(counterOffer.removed_item_names as string[]).includes(item.name)
  )

  const { error } = await supabase
    .from("deal_room_proposals")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      total_price: counterOffer.proposed_total,
      line_items: updatedLineItems,
    })
    .eq("id", proposal.id)

  if (error) throw new Error("Failed to accept counter-offer")
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)
}

export async function sendDealRoomLink(bookingId: string) {
  const { booking, photographerId } = await getOwnedBooking(bookingId)
  if (!booking.client_email) throw new Error("Booking has no client email")

  const photographerName = await getPhotographerName(photographerId)

  await sendDealRoomLinkEmail({
    clientEmail: booking.client_email,
    clientName: booking.client_name_primary,
    photographerName,
    bookingId,
    clientToken: booking.client_token,
  })
}
