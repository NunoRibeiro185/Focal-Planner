import { notFound } from "next/navigation";
import { getBookingById } from "@/lib/queries/bookings";
import { getExtras } from "@/lib/queries/extras";
import { getBookingEditingStages, getEditingStageTemplates } from "@/lib/queries/command-center";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { PaymentPanel } from "@/components/bookings/payment-panel";
import { DeliverablesPanel } from "@/components/bookings/deliverables-panel";
import { TasksPanel } from "@/components/bookings/tasks-panel";
import { ExtrasPanel } from "@/components/bookings/extras-panel";
import { StatusStepper } from "@/components/bookings/status-stepper";
import { EditingPipelinePanel } from "@/components/bookings/editing-pipeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { resolveBookingLayout } from "@/lib/utils/booking-layout";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, catalogExtras, editingStages, stageTemplates] = await Promise.all([
    getBookingById(id).catch(() => notFound()),
    getExtras(),
    getBookingEditingStages(id),
    getEditingStageTemplates(),
  ]);
  const { booking, tasks, deliverableProgress, itineraryStops, payments, bookingExtras, amountPaid, grandTotal, balance, overdue } = data;
  const v = booking.package_version;

  const layout = resolveBookingLayout(booking.status);
  const panels = new Set(layout.panels);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-[family-name:var(--font-heading)] leading-tight tracking-wide">
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
              {format(new Date(booking.event_date), "EEEE, d MMMM yyyy")}
            </span>
            {booking.start_time && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {booking.start_time}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/bookings/${id}/edit`}>Edit</Link>
        </Button>
      </div>

      {/* Status stepper */}
      {booking.status !== "cancelled" && (
        <StatusStepper bookingId={id} currentStatus={booking.status} />
      )}

      {/* ── Editing Pipeline (editing layout only, top position) ── */}
      {panels.has("editing_pipeline") && (
        <EditingPipelinePanel
          stages={editingStages}
          bookingId={id}
          hasTemplates={stageTemplates.length > 0}
        />
      )}

      {/* ── Info grid (shown in default layout) ── */}
      {(panels.has("package") || panels.has("schedule") || panels.has("itinerary")) && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Client — always shown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{booking.client_name_primary}</p>
              {booking.client_name_secondary && (
                <p className="text-muted-foreground">{booking.client_name_secondary}</p>
              )}
              {booking.client_email && (
                <a
                  href={`mailto:${booking.client_email}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {booking.client_email}
                </a>
              )}
              {booking.client_phone && (
                <a
                  href={`tel:${booking.client_phone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {booking.client_phone}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Itinerary */}
          {panels.has("itinerary") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {itineraryStops.length > 0 ? (
                  <div className="space-y-3">
                    {itineraryStops.map((stop, i) => (
                      <div key={stop.id} className={i > 0 ? "pt-3 border-t" : ""}>
                        <div className="flex items-start gap-2">
                          {stop.start_time && (
                            <span className="tabular-nums text-muted-foreground text-xs pt-0.5 w-10 shrink-0">
                              {stop.start_time.slice(0, 5)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{stop.name}</p>
                            {stop.address && (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-1 text-muted-foreground hover:text-foreground mt-0.5"
                              >
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="text-xs">{stop.address}</span>
                              </a>
                            )}
                            {stop.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{stop.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No itinerary set</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Package snapshot */}
          {panels.has("package") && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Package
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    v{v.version_number}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-bold text-base">
                  {formatCurrency(booking.total_price, v.currency)}
                </p>
                {booking.price_override && booking.price_override !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    Base {formatCurrency(v.base_price, v.currency)}{" "}
                    {booking.price_override > 0 ? "+" : ""}
                    {formatCurrency(booking.price_override, v.currency)} adjustment
                  </p>
                )}
                <p className="text-muted-foreground">{v.hours_of_coverage}h coverage</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Detail panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {panels.has("payment") && (
          <PaymentPanel
            booking={booking}
            payments={payments}
            amountPaid={amountPaid}
            balance={balance}
            overdue={overdue}
            grandTotal={grandTotal}
            currency={v.currency}
          />
        )}
        {panels.has("deliverables") && (
          <DeliverablesPanel deliverableProgress={deliverableProgress} bookingId={id} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {panels.has("extras") && (
          <ExtrasPanel
            bookingId={id}
            extras={bookingExtras}
            catalogExtras={catalogExtras}
            currency={v.currency}
          />
        )}

        {panels.has("tasks") && (
          <TasksPanel tasks={tasks} bookingId={id} />
        )}
      </div>
    </div>
  );
}
