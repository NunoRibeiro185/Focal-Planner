"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  bookingFormSchema,
  bookingServiceSchema,
  bookingExtraSchema,
  clientInfoSchema,
  bookingDepositSchema,
  type BookingFormValues,
  type BookingServiceValues,
  type BookingExtraValues,
  type ItineraryStopInput,
  type ClientInfoValues,
  type BookingDepositValues,
} from "@/lib/types/forms";
import { canTransition, isBackwardTransition, isForwardStepperTransition, isTerminalStatus } from "@/lib/utils/booking-status";
import { buildBookingStagesFromTemplates } from "@/lib/utils/editing-workflow";
import type { BookingStatus } from "@/lib/types";
import { syncBookingToGoogle } from "@/lib/actions/google-calendar";
import { computeSubtotal, computeFinalPrice, type BuilderLineItem } from "@/lib/utils/booking-builder";

/**
 * Replaces itinerary stops for a booking (delete all + insert new).
 */
async function replaceItineraryStops(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  photographerId: string,
  stops: ItineraryStopInput[]
) {
  await supabase
    .from("booking_itinerary_stops")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", photographerId);

  if (stops.length === 0) return;

  const { error } = await supabase.from("booking_itinerary_stops").insert(
    stops.map((s, i) => ({
      booking_id: bookingId,
      photographer_id: photographerId,
      name: s.name,
      address: s.address || null,
      start_time: s.start_time || null,
      notes: s.notes || null,
      sort_order: i,
    }))
  );
  if (error) throw error;
}

export async function createBooking(
  values: BookingFormValues,
  services: BookingServiceValues[] = [],
  itinerary: ItineraryStopInput[] = [],
  depositAlreadyPaid = false,
  addAnother = false
) {
  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  const parsedServices = services.map((s) => bookingServiceSchema.safeParse(s));
  if (parsedServices.some((p) => !p.success)) throw new Error("Invalid service data");
  const validServices = parsedServices.map((p) => (p as { success: true; data: BookingServiceValues }).data);

  const subtotal = validServices.reduce(
    (sum, s) => sum + s.unit_price_snapshot * s.quantity,
    0
  );
  const totalPrice = Math.max(0, subtotal - (data.discount_amount ?? 0));

  const { data: taskTemplates } = await supabase
    .from("task_templates")
    .select("id, title, sort_order")
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: true });

  const taskTitles = (taskTemplates ?? []).map((t) => t.title);
  const taskTemplateIds = (taskTemplates ?? []).map((t) => t.id);
  const taskSortOrders = (taskTemplates ?? []).map((t) => t.sort_order);

  const firstStop = itinerary[0];

  const { data: bookingId, error: rpcError } = await supabase.rpc(
    "create_booking_atomic",
    {
      p_photographer_id: user.id,
      p_client_name_primary: data.client_name_primary,
      p_client_name_secondary: data.client_name_secondary ?? undefined,
      p_client_email: data.client_email ?? undefined,
      p_client_phone: data.client_phone ?? undefined,
      p_venue_name: firstStop?.name ?? undefined,
      p_venue_address: firstStop?.address ?? undefined,
      p_event_date: data.event_date,
      p_start_time: firstStop?.start_time || undefined,
      p_notes: data.notes ?? undefined,
      p_total_price: totalPrice,
      p_deposit_amount: data.deposit_amount ?? undefined,
      p_payment_due_date: data.payment_due_date ?? undefined,
      p_deliverable_keys: [],
      p_task_titles: taskTitles,
      p_task_template_ids: taskTemplateIds,
      p_task_sort_orders: taskSortOrders,
      p_status: "confirmed",
      p_discount_amount: data.discount_amount ?? 0,
    }
  );

  if (rpcError) throw rpcError;

  const bid = bookingId as string;

  const parallelOps: PromiseLike<unknown>[] = [
    replaceItineraryStops(supabase, bid, user.id, itinerary),
  ];

  if (data.lead_source || data.location) {
    parallelOps.push(
      supabase
        .from("bookings")
        .update({ lead_source: data.lead_source ?? null, location: data.location ?? null })
        .eq("id", bid)
        .eq("photographer_id", user.id)
    );
  }

  if (validServices.length > 0) {
    parallelOps.push(
      supabase.from("booking_services").insert(
        validServices.map((s, i) => ({
          booking_id: bid,
          photographer_id: user.id,
          service_id: s.service_id ?? null,
          name_snapshot: s.name_snapshot,
          description_snapshot: s.description_snapshot ?? null,
          unit_price_snapshot: s.unit_price_snapshot,
          quantity: s.quantity,
          track_completion_snapshot: s.track_completion_snapshot,
          done: false,
          sort_order: i,
        }))
      )
    );
  }

  if (depositAlreadyPaid && data.deposit_amount && data.deposit_amount > 0) {
    parallelOps.push(
      supabase.from("payment_log_entries").insert({
        booking_id: bid,
        photographer_id: user.id,
        amount: data.deposit_amount,
        paid_date: new Date().toISOString().split("T")[0],
        note: "Deposit (logged at booking creation)",
      })
    );
  }

  await Promise.all(parallelOps);

  revalidatePath("/bookings");
  revalidatePath("/calendar");

  syncBookingToGoogle(bid, "create").catch((e) =>
    console.error("[GoogleSync] createBooking:", e)
  );

  if (addAnother) {
    redirect("/bookings/new");
  } else {
    redirect(`/bookings/${bid}`);
  }
}

export async function createInquiry(
  values: BookingFormValues,
  itinerary: ItineraryStopInput[] = []
) {
  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  const { data: taskTemplates } = await supabase
    .from("task_templates")
    .select("id, title, sort_order")
    .eq("photographer_id", user.id)
    .order("sort_order", { ascending: true });

  const taskTitles = (taskTemplates ?? []).map((t) => t.title);
  const taskTemplateIds = (taskTemplates ?? []).map((t) => t.id);
  const taskSortOrders = (taskTemplates ?? []).map((t) => t.sort_order);

  const firstStop = itinerary[0];

  const { data: bookingId, error: rpcError } = await supabase.rpc(
    "create_booking_atomic",
    {
      p_photographer_id: user.id,
      p_client_name_primary: data.client_name_primary,
      p_client_name_secondary: data.client_name_secondary ?? undefined,
      p_client_email: data.client_email ?? undefined,
      p_client_phone: data.client_phone ?? undefined,
      p_venue_name: firstStop?.name ?? undefined,
      p_venue_address: firstStop?.address ?? undefined,
      p_event_date: data.event_date,
      p_start_time: firstStop?.start_time || undefined,
      p_notes: data.notes ?? undefined,
      p_total_price: 0,
      p_deliverable_keys: [],
      p_task_titles: taskTitles,
      p_task_template_ids: taskTemplateIds,
      p_task_sort_orders: taskSortOrders,
      p_status: "inquiry",
      p_discount_amount: 0,
    }
  );

  if (rpcError) throw rpcError;

  const bid = bookingId as string;

  await Promise.all([
    replaceItineraryStops(supabase, bid, user.id, itinerary),
    data.lead_source || data.location
      ? supabase
          .from("bookings")
          .update({ lead_source: data.lead_source ?? null, location: data.location ?? null })
          .eq("id", bid)
          .eq("photographer_id", user.id)
      : Promise.resolve(),
  ]);

  revalidatePath("/inquiries");
  redirect(`/bookings/${bid}`);
}

/**
 * Full edit of a booking.
 * Updates mutable fields and replaces itinerary stops.
 * Package reassignment is handled separately via updateBookingPackage.
 */
export async function updateBookingFull(
  bookingId: string,
  values: BookingFormValues,
  _originalPackageVersionId: string | null,
  itinerary: ItineraryStopInput[] = []
) {
  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const data = parsed.data;

  const firstStop = itinerary[0];

  // Update mutable fields
  const { error } = await supabase
    .from("bookings")
    .update({
      client_name_primary: data.client_name_primary,
      client_name_secondary: data.client_name_secondary ?? null,
      client_email: data.client_email ?? null,
      client_phone: data.client_phone ?? null,
      lead_source: data.lead_source ?? null,
      location: data.location ?? null,
      venue_name: firstStop?.name ?? null,
      venue_address: firstStop?.address ?? null,
      event_date: data.event_date,
      start_time: firstStop?.start_time || null,
      duration_hours: null,
      notes: data.notes ?? null,
      deposit_amount: data.deposit_amount ?? null,
      payment_due_date: data.payment_due_date ?? null,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // Replace itinerary stops
  await replaceItineraryStops(supabase, bookingId, user.id, itinerary);

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/calendar");

  // Fire-and-forget Google Calendar sync
  syncBookingToGoogle(bookingId, "update").catch((e) =>
    console.error("[GoogleSync] updateBookingFull:", e)
  );

  redirect(`/bookings/${bookingId}`);
}

/**
 * Transitions a booking to a new status.
 * Validates the transition is allowed before applying it.
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchError || !booking) throw new Error("Booking not found");

  const from = booking.status as BookingStatus;
  const allowed =
    canTransition(from, newStatus) ||
    (isBackwardTransition(from, newStatus) && !isTerminalStatus(newStatus)) ||
    isForwardStepperTransition(from, newStatus);

  if (!allowed) {
    throw new Error(`Cannot transition from "${booking.status}" to "${newStatus}"`);
  }

  const autoArchive = newStatus === "done" || newStatus === "cancelled";

  const { error } = await supabase
    .from("bookings")
    .update({ status: newStatus, ...(autoArchive ? { is_archived: true } : {}) })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // Editing workflow hooks
  if (newStatus === "editing") {
    // Create per-booking stage copies from the photographer's template
    const { data: templates } = await supabase
      .from("editing_stage_templates")
      .select("id, title, sort_order")
      .eq("photographer_id", user.id)
      .order("sort_order", { ascending: true });

    const stages = buildBookingStagesFromTemplates(
      templates ?? [],
      bookingId,
      user.id
    );

    if (stages.length > 0) {
      await supabase.from("booking_editing_stages").insert(stages);
    }
  } else if (isBackwardTransition(from, newStatus)) {
    // Reset editing progress when rolling back through the editing stage
    const fromIdx = ["inquiry", "confirmed", "shoot_completed", "editing", "delivered", "done"].indexOf(from);
    const toIdx = ["inquiry", "confirmed", "shoot_completed", "editing", "delivered", "done"].indexOf(newStatus);
    if (fromIdx > toIdx && fromIdx >= 3) {
      // Was in editing or beyond — wipe stage progress
      await supabase
        .from("booking_editing_stages")
        .delete()
        .eq("booking_id", bookingId)
        .eq("photographer_id", user.id);
    }
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/calendar");

  // For cancellation: caller is responsible for prompting the user and calling
  // syncBookingToGoogle(bookingId, "delete") if they confirm removal from Google Calendar.
  // For all other status changes, sync the updated event automatically.
  if (newStatus !== "cancelled") {
    syncBookingToGoogle(bookingId, "update").catch((e) =>
      console.error("[GoogleSync] updateBookingStatus:", e)
    );
  }
}

/**
 * Deletes the booking's Google Calendar event after user confirms on cancellation.
 * Called explicitly from the UI after the user acknowledges the prompt.
 */
export async function removeBookingFromGoogleCalendar(bookingId: string) {
  syncBookingToGoogle(bookingId, "delete").catch((e) =>
    console.error("[GoogleSync] removeBookingFromGoogleCalendar:", e)
  );
}

/**
 * Updates only the notes field of a booking.
 */
export async function updateBookingNotes(bookingId: string, notes: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({ notes: notes || null })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Quick-updates the date and start time of a booking from the calendar popover.
 */
export async function updateBookingQuick(
  bookingId: string,
  data: { event_date: string; start_time: string | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({ event_date: data.event_date, start_time: data.start_time })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/calendar");
  revalidatePath(`/bookings/${bookingId}`);

  syncBookingToGoogle(bookingId, "update").catch((e) =>
    console.error("[GoogleSync] updateBookingQuick:", e)
  );
}

/**
 * Updates client-facing info fields inline (names, contact, lead source, location).
 */
export async function updateBookingCoreFields(
  bookingId: string,
  values: ClientInfoValues
) {
  const parsed = clientInfoSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid client info data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({
      client_name_primary: parsed.data.client_name_primary,
      client_name_secondary: parsed.data.client_name_secondary ?? null,
      client_email: parsed.data.client_email || null,
      client_phone: parsed.data.client_phone ?? null,
      lead_source: parsed.data.lead_source ?? null,
      location: parsed.data.location ?? null,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Reassigns a booking to a different package template (uses the template's
 * current version). Re-seeds deliverable progress for the new version.
 */
export async function updateBookingPackage(
  bookingId: string,
  packageTemplateId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: booking } = await supabase
    .from("bookings")
    .select("price_override, total_price")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  const { data: template, error: templateError } = await supabase
    .from("package_templates")
    .select("current_version_id, package_versions!fk_current_version(base_price)")
    .eq("id", packageTemplateId)
    .eq("photographer_id", user.id)
    .single();

  if (templateError || !template?.current_version_id) {
    throw new Error("Package not found or has no version");
  }

  const newVersion = template.package_versions;
  if (!newVersion) throw new Error("Package has no version");
  const priceOverride = booking?.price_override ?? 0;
  const newTotalPrice = newVersion.base_price + priceOverride;

  const { error: rpcError } = await supabase.rpc("reassign_booking_package", {
    p_booking_id: bookingId,
    p_photographer_id: user.id,
    p_new_package_version_id: template.current_version_id,
    p_new_total_price: newTotalPrice,
  });

  if (rpcError) throw rpcError;

  await supabase
    .from("booking_deliverable_progress")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id);

  // seedDeliverableProgress removed — deliverables now handled via booking_services

  revalidatePath(`/bookings/${bookingId}`);

  syncBookingToGoogle(bookingId, "update").catch((e) =>
    console.error("[GoogleSync] updateBookingPackage:", e)
  );
}

/**
 * Updates deposit amount and payment due date.
 */
export async function updateBookingDeposit(
  bookingId: string,
  values: BookingDepositValues
) {
  const parsed = bookingDepositSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid deposit data");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({
      deposit_amount: parsed.data.deposit_amount,
      payment_due_date: parsed.data.payment_due_date ?? null,
    })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Archives a booking (hides from main list, shows in Archived tab).
 */
export async function archiveBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({ is_archived: true })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Unarchives a booking (moves it back to the main list).
 */
export async function unarchiveBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("bookings")
    .update({ is_archived: false })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Permanently deletes a booking and all related data.
 * Expenses are explicitly deleted first since they use ON DELETE SET NULL.
 * All other child records cascade automatically.
 */
export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Verify ownership
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, google_event_id")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (fetchError || !booking) throw new Error("Booking not found");

  // Delete expenses explicitly (they use SET NULL, not CASCADE)
  await supabase
    .from("expenses")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id);

  // Delete the booking (all other child records cascade)
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  // Fire-and-forget: remove Google Calendar event if one exists
  if (booking.google_event_id) {
    syncBookingToGoogle(bookingId, "delete").catch((e) =>
      console.error("[GoogleSync] deleteBooking:", e)
    );
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  redirect("/bookings");
}

/**
 * Toggles the done state of a booking deliverable progress row.
 */
export async function toggleBookingDeliverable(
  progressId: string,
  done: boolean,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_deliverable_progress")
    .update({ done })
    .eq("id", progressId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Adds an extra to a booking. Price and name are snapshotted at the time of
 * adding — future changes do not affect this record.
 */
export async function addBookingExtra(
  bookingId: string,
  values: BookingExtraValues
) {
  const parsed = bookingExtraSchema.safeParse(values);
  if (!parsed.success) throw new Error("Invalid booking extra data");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("photographer_id", user.id)
    .single();

  if (bookingError || !booking) throw new Error("Booking not found");

  const { error } = await supabase.from("booking_extras").insert({
    booking_id: bookingId,
    photographer_id: user.id,
    extra_id: parsed.data.extra_id ?? null,
    name_snapshot: parsed.data.name_snapshot,
    price_snapshot: parsed.data.price_snapshot,
    currency_snapshot: parsed.data.currency_snapshot,
    quantity: parsed.data.quantity,
  });

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * Removes an extra from a booking.
 */
export async function removeBookingExtra(
  bookingExtraId: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("booking_extras")
    .delete()
    .eq("id", bookingExtraId)
    .eq("photographer_id", user.id);

  if (error) throw error;

  revalidatePath(`/bookings/${bookingId}`);
}

export async function updateBookingServices(
  bookingId: string,
  items: BuilderLineItem[],
  discount: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const subtotal = computeSubtotal(items);
  const totalPrice = computeFinalPrice(subtotal, discount);

  const { error: deleteError } = await supabase
    .from("booking_services")
    .delete()
    .eq("booking_id", bookingId)
    .eq("photographer_id", user.id);
  if (deleteError) throw deleteError;

  if (items.length > 0) {
    const { error: insertError } = await supabase.from("booking_services").insert(
      items.map((item, i) => ({
        booking_id: bookingId,
        photographer_id: user.id,
        service_id: item.service_id ?? null,
        name_snapshot: item.name_snapshot,
        description_snapshot: item.description_snapshot ?? null,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
        track_completion_snapshot: item.track_completion_snapshot,
        done: false,
        sort_order: i,
      }))
    );
    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ total_price: totalPrice, discount_amount: discount })
    .eq("id", bookingId)
    .eq("photographer_id", user.id);
  if (updateError) throw updateError;

  revalidatePath(`/bookings/${bookingId}`);
}
