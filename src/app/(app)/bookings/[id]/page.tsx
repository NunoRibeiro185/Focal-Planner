import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/queries/bookings";
import { getExtras } from "@/lib/queries/extras";
import { getPackageTemplates } from "@/lib/queries/packages";
import { getEditingStageTemplates } from "@/lib/queries/command-center";
import { getCalendarEventsForAvailabilityPanel } from "@/lib/queries/availability-calendar";
import { getSecondShooterView, getSecondShooterNotes } from "@/lib/queries/second-shooter";
import { resolveBookingLayout, getAllPanels } from "@/lib/utils/booking-layout";
import type { PanelSlot } from "@/lib/utils/booking-layout";
import type {
  BookingWithVersion,
  BookingTask,
  BookingExtra,
  BookingDeliverableProgress,
  BookingItineraryStop,
  PaymentLogEntry,
  BookingEditingStage,
  EditingStageTemplate,
  CalendarEvent,
  PackageTemplateWithVersion,
} from "@/lib/types";
import { createClient, getUser } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { StatusStepper } from "@/components/bookings/status-stepper";
import { PaymentPanel } from "@/components/bookings/payment-panel";
import { DeliverablesPanel } from "@/components/bookings/deliverables-panel";
import { TasksPanel } from "@/components/bookings/tasks-panel";
import { PackageExtrasCard } from "@/components/bookings/extras-panel";
import { EditingPipelinePanel } from "@/components/bookings/editing-pipeline-panel";
import { AvailabilityCalendarPanel } from "@/components/bookings/availability-calendar-panel";
import { SecondShooterPanel } from "@/components/bookings/second-shooter-panel";
import { SecondShooterBookingView } from "@/components/bookings/second-shooter-booking-view";
import {
  ClientInfoCard,
  ItineraryCard,
  NotesCard,
} from "@/components/bookings/booking-detail-cards";
import { format } from "date-fns";
import { MapPin, Calendar, Clock } from "lucide-react";

// ─── Section renderer ─────────────────────────────────────────────────────────

const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid gap-6 grid-cols-1 lg:grid-cols-2",
  3: "grid gap-4 grid-cols-1 md:grid-cols-3",
  4: "grid gap-4 grid-cols-1 md:grid-cols-4",
  5: "grid gap-4 grid-cols-1 md:grid-cols-5",
  6: "grid gap-4 grid-cols-1 md:grid-cols-6",
};

const COL_SPAN_CLASS: Record<number, string> = {
  1: "",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  const [data, catalogExtras, stageTemplates, packageTemplates, photographerResult] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getExtras(),
    getEditingStageTemplates(),
    getPackageTemplates(),
    supabase.from("photographers").select("default_currency").eq("id", user!.id).single(),
  ]);

  const {
    booking,
    tasks,
    deliverableProgress,
    itineraryStops,
    editingStages,
    payments,
    bookingExtras,
    bookingExpenses,
    amountPaid,
    grandTotal,
    balance,
    overdue,
  } = data;

  const defaultCurrency =
    (photographerResult.data as { default_currency: string } | null)?.default_currency ?? "EUR";
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

  // Cast package templates to the shape the component expects
  const pkgTemplates = packageTemplates as unknown as PackageTemplateWithVersion[];

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
            extras={bookingExtras}
            catalogExtras={catalogExtras}
            packageTemplates={pkgTemplates}
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
        if (!v) return null;
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
            currency={v.currency}
            defaultCurrency={defaultCurrency}
          />
        );

      case "tasks":
        return <TasksPanel key={panel} tasks={tasks} bookingId={id} />;

      case "deliverables":
        if (deliverableProgress.length === 0) return null;
        return (
          <DeliverablesPanel
            key={panel}
            deliverableProgress={deliverableProgress}
            bookingId={id}
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
          <SecondShooterPanel
            key={panel}
            booking={booking}
            bookingId={id}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-5xl font-[family-name:var(--font-heading)] leading-tight tracking-wide">
            {booking.client_name_primary}
            {booking.client_name_secondary && ` & ${booking.client_name_secondary}`}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <BookingStatusBadge status={booking.status} />
            {booking.venue_name && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {booking.venue_name}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {booking.event_date
                ? format(new Date(booking.event_date), "EEEE, d MMMM yyyy")
                : "Date TBD"}
            </span>
            {booking.start_time && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {booking.start_time}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Status stepper ── */}
      {booking.status !== "cancelled" && (
        <StatusStepper bookingId={id} currentStatus={booking.status} />
      )}

      {/* ── Layout sections ── */}
      {layout.sections.map((section, sectionIndex) => {
        const rendered = section.slots
          .map((slot) => ({ node: renderPanel(slot), weight: slot.weight ?? 1 }))
          .filter((item): item is { node: React.ReactElement; weight: number } => item.node !== null);

        if (rendered.length === 0) return null;

        if (rendered.length === 1) {
          return <div key={sectionIndex}>{rendered[0].node}</div>;
        }

        const totalWeight = rendered.reduce((sum, item) => sum + item.weight, 0);
        const gridClass = GRID_COLS_CLASS[totalWeight] ?? `grid gap-4 grid-cols-1 md:grid-cols-${totalWeight}`;

        return (
          <div key={sectionIndex} className={gridClass}>
            {rendered.map(({ node, weight }) => {
              const spanClass = COL_SPAN_CLASS[weight] ?? `col-span-${weight}`;
              return weight === 1
                ? node
                : <div key={(node as React.ReactElement).key} className={spanClass}>{node}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}
