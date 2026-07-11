"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { after } from "next/server"
import { verifyClientToken } from "@/lib/services/deal-room-access"
import { computeNextSortOrder } from "@/lib/utils/deal-room-qa"
import {
  sendProposalEmail,
  sendProposalAcceptedEmail,
  sendCounterOfferEmail,
  sendItineraryUpdatedEmail,
  sendAnswersSubmittedEmail,
  sendDealRoomLinkEmail,
  sendChangeRequestEmail,
} from "@/lib/services/deal-room-emails"
import type { ProposalLineItem } from "@/lib/types/deal-room"
import type { Json } from "@/lib/types/supabase"
import { computeSubtotal, computeFinalPrice, type BuilderLineItem } from "@/lib/utils/booking-builder"

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

const sendChangeRequestSchema = z.object({
  bookingId: z.string().uuid(),
  packageName: z.string().min(1),
  items: z.array(z.object({
    service_id: z.string().uuid().nullable().optional(),
    name_snapshot: z.string().min(1),
    description_snapshot: z.string().nullable().optional(),
    unit_price_snapshot: z.number().nonnegative(),
    quantity: z.number().int().positive(),
    track_completion_snapshot: z.boolean(),
  })),
  discount: z.number().nonnegative(),
})

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getOwnedBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const supabaseService = createServiceRoleClient()
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
  const supabase = createServiceRoleClient()
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
  const supabase = createServiceRoleClient()
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

  const supabase = createServiceRoleClient()
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
    after(() =>
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

  const supabase = createServiceRoleClient()

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

  const supabase = createServiceRoleClient()
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

  const supabase = createServiceRoleClient()

  // Fetch proposal first so we can inspect line_items before updating
  const { data: proposalData, error: fetchError } = await supabase
    .from("deal_room_proposals")
    .select("id, line_items, total_price")
    .eq("id", proposalId)
    .eq("booking_id", bookingId)
    .eq("status", "sent")
    .single()
  if (fetchError || !proposalData) throw new Error("Proposal is no longer available for acceptance")

  const { error } = await supabase
    .from("deal_room_proposals")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", proposalId)
  if (error) throw new Error("Failed to accept proposal")

  // If this is a change request (line items contain service metadata), apply them
  const lineItems = proposalData.line_items as unknown as ProposalLineItem[]
  const isChangeRequest = lineItems?.some((item) => item.unit_price_snapshot !== undefined)
  if (isChangeRequest) {
    const discountItem = lineItems.find((item) => item._discount !== undefined)
    const discount = discountItem?._discount ?? 0
    const serviceItems = lineItems.filter((item) => item.unit_price_snapshot !== undefined)
    await applyChangeRequest(bookingId, booking.photographer_id, serviceItems, discount, proposalData.total_price)
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  const photographerEmail = await getPhotographerEmail(booking.photographer_id)
  if (photographerEmail) {
    after(() =>
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

  const supabase = createServiceRoleClient()

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
    after(async () => {
      try {
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
      } catch (e) {
        console.error(e)
      }
    })
  }
}

export async function addClientItineraryStop(input: unknown) {
  const { bookingId, token, name, address, startTime, notes } =
    itineraryStopSchema.parse(input)
  const booking = await assertClientToken(bookingId, token)

  const supabase = createServiceRoleClient()

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
    after(() =>
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

  const supabase = createServiceRoleClient()

  const { data: question, error: questionError } = await supabase
    .from("deal_room_questions")
    .select("id")
    .eq("id", questionId)
    .eq("booking_id", bookingId)
    .single()
  if (questionError || !question) throw new Error("Question not found")

  // Check if an answer already exists before upserting (to avoid emailing on every edit)
  const { data: existingAnswer } = await supabase
    .from("deal_room_answers")
    .select("id")
    .eq("question_id", questionId)
    .maybeSingle()

  const isNewAnswer = !existingAnswer

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

  // Only email the photographer when the client submits an answer for the first time
  if (isNewAnswer) {
    const photographerEmail = await getPhotographerEmail(booking.photographer_id)
    if (photographerEmail) {
      after(() =>
        sendAnswersSubmittedEmail({
          photographerEmail,
          clientName: booking.client_name_primary,
          bookingId,
        }).catch(console.error)
      )
    }
  }
}

export async function acceptCounterOffer(bookingId: string) {
  await getOwnedBooking(bookingId)
  const supabase = createServiceRoleClient()

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

async function applyChangeRequest(
  bookingId: string,
  photographerId: string,
  serviceItems: ProposalLineItem[],
  discount: number,
  totalPrice: number
) {
  const supabase = createServiceRoleClient()

  await supabase
    .from("booking_services")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", photographerId)

  if (serviceItems.length > 0) {
    const { error } = await supabase.from("booking_services").insert(
      serviceItems.map((item, i) => ({
        booking_id: bookingId,
        photographer_id: photographerId,
        service_id: item.service_id ?? null,
        name_snapshot: item.name,
        description_snapshot: item.description_snapshot ?? null,
        unit_price_snapshot: item.unit_price_snapshot!,
        quantity: item.quantity ?? 1,
        track_completion_snapshot: item.track_completion_snapshot ?? false,
        done: false,
        sort_order: i,
      }))
    )
    if (error) throw new Error("Failed to apply change request services")
  }

  await supabase
    .from("bookings")
    .update({ total_price: totalPrice, discount_amount: discount })
    .eq("id", bookingId)
}

export async function sendChangeRequest(input: unknown) {
  const { bookingId, packageName, items, discount } = sendChangeRequestSchema.parse(input)
  const { booking, photographerId } = await getOwnedBooking(bookingId)

  const lineItems: ProposalLineItem[] = [
    ...items.map((item) => ({
      name: item.name_snapshot,
      price: item.unit_price_snapshot * item.quantity,
      is_base: false,
      service_id: item.service_id ?? null,
      quantity: item.quantity,
      description_snapshot: item.description_snapshot ?? null,
      unit_price_snapshot: item.unit_price_snapshot,
      track_completion_snapshot: item.track_completion_snapshot,
    })),
    ...(discount > 0
      ? [{ name: "__discount__", price: 0, is_base: false, _discount: discount }]
      : []),
  ]

  const subtotal = computeSubtotal(items as BuilderLineItem[])
  const totalPrice = computeFinalPrice(subtotal, discount)

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("deal_room_proposals").insert({
    booking_id: bookingId,
    photographer_id: photographerId,
    package_name: packageName,
    line_items: lineItems as unknown as Json,
    total_price: totalPrice,
    allow_renegotiation: false,
    status: "sent",
  })
  if (error) throw new Error("Failed to send change request")

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/client/${bookingId}`)

  if (booking.client_email) {
    const photographerName = await getPhotographerName(photographerId)
    after(() =>
      sendChangeRequestEmail({
        clientEmail: booking.client_email!,
        clientName: booking.client_name_primary,
        photographerName,
        bookingId,
        clientToken: booking.client_token,
      }).catch(console.error)
    )
  }
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
