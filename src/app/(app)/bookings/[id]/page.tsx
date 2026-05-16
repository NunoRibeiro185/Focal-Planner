import React from "react";
import { notFound } from "next/navigation";
import { FeatureGate } from "@/components/paywall/feature-gate";
import { getBookingById, getInquiryAnswers } from "@/lib/queries/bookings";
import { getBookingServices, getServices } from "@/lib/queries/services";
import { getPackageTemplatesWithServices } from "@/lib/queries/packages";
import { getEditingStageTemplates } from "@/lib/queries/command-center";
import { getCalendarEventsForAvailabilityPanel } from "@/lib/queries/availability-calendar";
import { getSecondShooterView, getSecondShooterNotes } from "@/lib/queries/second-shooter";
import { resolveBookingLayout, getAllPanels } from "@/lib/utils/booking-layout";
import type { PanelSlot } from "@/lib/utils/booking-layout";
import type {
  BookingWithVersion,
  BookingTask,
  BookingItineraryStop,
  PaymentLogEntry,
  BookingEditingStage,
  EditingStageTemplate,
  CalendarEvent,
} from "@/lib/types";
import type { PackageTemplateWithServices } from "@/lib/types/services";
import { createClient, getUser } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { StatusStepper } from "@/components/bookings/status-stepper";
import { PaymentPanel } from "@/components/bookings/payment-panel";
import { ServicesPanel } from "@/components/bookings/deliverables-panel";
import { TasksPanel } from "@/components/bookings/tasks-panel";
import { PackageExtrasCard } from "@/components/bookings/package-panel";
import { EditingPipelinePanel } from "@/components/bookings/editing-pipeline-panel";
import { AvailabilityCalendarPanel } from "@/components/bookings/availability-calendar-panel";
import { SecondShooterPanel } from "@/components/bookings/second-shooter-panel";
import { SecondShooterBookingView } from "@/components/bookings/second-shooter-booking-view";
import {
  ClientInfoCard,
  ItineraryCard,
  NotesCard,
} from "@/components/bookings/booking-detail-cards";
import { InquiryQAPanel } from "@/components/bookings/inquiry-qa-panel";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Archive, CheckCircle2 } from "lucide-react";
import { BookingArchiveDeleteActions } from "@/components/bookings/booking-archive-delete-actions";
import { getDealRoomData } from "@/lib/queries/deal-room";
import { ClientPortalPanel } from "@/components/bookings/client-portal-panel";

const STAGE_CONTEXT: Partial<Record<string, string>> = {
  inquiry: "Evaluating this lead — check your availability, review the details, and decide.",
  confirmed: "Shoot is locked in — itinerary and tasks are your day-of reference.",
  shoot_completed: "Back from the shoot — run through your post-shoot checklist.",
  editing: "In post-production — track progress through your editing pipeline.",
  delivered: "Gallery is out. Follow up on final payments and any remaining deliverables.",
  done: "All wrapped up. Another story beautifully told.",
  cancelled: "This booking was cancelled.",
};

// ─── Section renderer ─────────────────────────────────────────────────────────


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const [data, stageTemplates, packageTemplates, photographerResult, inquiryAnswers, bookingServices, catalogServices, dealRoomData] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getEditingStageTemplates(),
    getPackageTemplatesWithServices(),
    supabase.from("photographers").select("default_currency").eq("id", user!.id).single(),
    getInquiryAnswers(id),
    getBookingServices(id),
    getServices(),
    getDealRoomData(id),
  ]);

  const {
    booking,
    tasks,
    deliverableProgress,
    itineraryStops,
    editingStages,
    payments,
    bookingExpenses,
    amountPaid,
    grandTotal,
    balance,
    overdue,
  } = data;

  const defaultCurrency =
    (photographerResult.data as { default_currency: string } | null)?.default_currency ?? "EUR";
  const bookingCurrency = booking.package_version?.currency ?? defaultCurrency;
  const v = booking.package_version;

  // If the current user is the accepted second shooter, show the dedicated view
  const isSecondShooter = booking.second_shooter_id === user?.id;
  if (isSecondShooter) {
    const [ssView, ssNotes] = await Promise.all([
      getSecondShooterView(id),
      getSecondShooterNotes(id),
    ]);
    if (!ssView) notFound();
    return (
      <SecondShooterBookingView
        view={ssView}
        tasks={tasks}
        privateNotes={ssNotes}
        bookingId={id}
      />
    );
  }

  const layout = resolveBookingLayout(booking.status);
  const panelSet = new Set(getAllPanels(layout));

  // Fetch calendar events only when the layout includes the panel
  const calendarEvents: CalendarEvent[] =
    panelSet.has("availability_calendar") && booking.event_date
      ? await getCalendarEventsForAvailabilityPanel(booking.event_date)
      : [];

  const pkgTemplates = packageTemplates as PackageTemplateWithServices[];

  // ── Panel renderer ─────────────────────────────────────────────────────────

  function renderPanel(slot: PanelSlot): React.ReactNode {
    const { panel, forceShow } = slot;

    switch (panel) {
      case "client_info":
        return <ClientInfoCard key={panel} booking={booking} bookingId={id} />;

      case "availability_calendar":
        return (
          <AvailabilityCalendarPanel
            key={panel}
            eventDate={booking.event_date}
            location={booking.location}
            events={calendarEvents}
            bookingId={id}
            bookingStatus={booking.status}
          />
        );

      case "package_extras":
        return (
          <PackageExtrasCard
            key={panel}
            booking={booking}
            bookingId={id}
            bookingServices={bookingServices}
            catalogServices={catalogServices}
            packages={pkgTemplates}
            currency={bookingCurrency}
            proposal={dealRoomData?.proposal ?? null}
          />
        );

      case "itinerary":
        return (
          <ItineraryCard
            key={panel}
            itineraryStops={itineraryStops}
            bookingId={id}
          />
        );

      case "notes":
        if (!forceShow && !booking.notes) return null;
        return <NotesCard key={panel} notes={booking.notes} bookingId={id} />;

      case "payment":
        return (
          <PaymentPanel
            key={panel}
            booking={booking}
            payments={payments}
            bookingExpenses={bookingExpenses}
            amountPaid={amountPaid}
            balance={balance}
            overdue={overdue}
            grandTotal={grandTotal}
            currency={bookingCurrency}
            defaultCurrency={defaultCurrency}
          />
        );

      case "tasks":
        return <TasksPanel key={panel} tasks={tasks} bookingId={id} />;

      case "deliverables":
        return (
          <ServicesPanel
            key={panel}
            bookingId={id}
            bookingServices={bookingServices}
            catalogServices={catalogServices}
            currency={booking.package_version?.currency ?? defaultCurrency}
          />
        );

      case "editing_pipeline":
        return (
          <EditingPipelinePanel
            key={panel}
            stages={editingStages}
            bookingId={id}
            hasTemplates={stageTemplates.length > 0}
          />
        );

      case "second_shooter":
        return (
          <FeatureGate key={panel} feature="secondShooter" description="Upgrade to Pro to collaborate with a second shooter on bookings.">
            <SecondShooterPanel
              booking={booking}
              bookingId={id}
            />
          </FeatureGate>
        );

      case "inquiry_qa":
        if (inquiryAnswers.length === 0) return null;
        return (
          <InquiryQAPanel
            key={panel}
            answers={inquiryAnswers}
            formName={booking.inquiry_form_name_snapshot ?? null}
            submittedAt={booking.created_at}
          />
        );

      default:
        return null;
    }
  }

  const isArchive = booking.status === "done" || booking.status === "cancelled";
  const stageContext = STAGE_CONTEXT[booking.status];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-heading)] leading-tight tracking-wide break-words">
            {booking.client_name_primary}
            {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
          </h1>
          <div className="flex items-center gap-x-4 gap-y-1 mt-3 flex-wrap">
            {booking.status === "cancelled" && (
              <BookingStatusBadge status={booking.status} />
            )}
            {booking.venue_name && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {booking.venue_name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {booking.event_date
                ? format(new Date(booking.event_date), "EEEE, d MMMM yyyy")
                : "Date TBD"}
            </span>
            {booking.start_time && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {booking.start_time}
              </span>
            )}
          </div>
        </div>
        <BookingArchiveDeleteActions
          bookingId={id}
          isArchived={booking.is_archived ?? false}
          clientName={booking.client_name_primary}
        />
      </div>

      {/* ── Status stepper ── */}
      {booking.status !== "cancelled" && (
        <div className="mb-6">
          <StatusStepper bookingId={id} currentStatus={booking.status} />
        </div>
      )}

      {/* ── Stage context hint ── */}
      {stageContext && (
        <p className="text-sm text-muted-foreground mb-6">{stageContext}</p>
      )}

      {/* ── Archive notice ── */}
      {isArchive && (
        booking.status === "done" ? (
          <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "var(--color-primary)" }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>Archived — all panels are read-only.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <Archive className="h-4 w-4 shrink-0" />
            <span>This booking was cancelled — kept here for reference.</span>
          </div>
        )
      )}

      {/* ── Divider ── */}
      <div className="h-px bg-border" />

      {/* ── Layout sections + client portal ── */}
      <div className={isArchive ? "divide-y divide-border opacity-80" : "divide-y divide-border"}>
        {layout.sections.map((section, sectionIndex) => {
          const rendered = section.slots
            .map((slot) => ({ node: renderPanel(slot), weight: slot.weight ?? 1 }))
            .filter((item): item is { node: React.ReactElement; weight: number } => item.node !== null);

          if (rendered.length === 0) return null;

          if (rendered.length === 1) {
            return <div key={sectionIndex} className="py-6">{rendered[0].node}</div>;
          }

          return (
            <div key={sectionIndex} className="py-6 flex items-stretch w-full">
              {rendered.map(({ node, weight }, i) => (
                <React.Fragment key={(node as React.ReactElement).key}>
                  {i > 0 && <div className="w-px bg-border shrink-0 mx-4" />}
                  <div style={{ flex: weight }} className="min-w-0 *:h-full">{node}</div>
                </React.Fragment>
              ))}
            </div>
          );
        })}

        {dealRoomData && (
          <div className="py-6">
            <ClientPortalPanel
              bookingId={booking.id}
              clientToken={dealRoomData.booking.client_token}
              clientEmail={dealRoomData.booking.client_email}
              proposal={dealRoomData.proposal}
              counterOffer={dealRoomData.counterOffer}
              questions={dealRoomData.questions}
              currency={bookingCurrency}
            />
          </div>
        )}
      </div>
    </div>
  );
}
