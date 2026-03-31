import {
  getNextWedding,
  getEditingBench,
  getCommandCenterTasks,
  getInquiryBookings,
  getActiveBookingsForTaskAssignment,
} from "@/lib/queries/command-center";
import { CommandCenterTasksPanel } from "@/components/command-center/tasks-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { Camera, Clock, Users, ImageIcon } from "lucide-react";

export default async function CommandCenterPage() {
  const [nextWedding, editingBench, tasks, inquiryBookings, bookingOptions] = await Promise.all([
    getNextWedding(),
    getEditingBench(),
    getCommandCenterTasks(),
    getInquiryBookings(),
    getActiveBookingsForTaskAssignment(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Command Center</h1>

      {/* ── Hero: Next Wedding ────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          {nextWedding ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Next Wedding
                  </p>
                  <h2 className="text-2xl font-bold">
                    {nextWedding.booking.client_name_primary}
                    {nextWedding.booking.client_name_secondary &&
                      ` & ${nextWedding.booking.client_name_secondary}`}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {nextWedding.booking.event_date
                      ? format(new Date(nextWedding.booking.event_date), "EEEE, d MMMM yyyy")
                      : "Date TBD"}
                    {nextWedding.booking.venue_name &&
                      ` · ${nextWedding.booking.venue_name}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-4xl font-bold tabular-nums text-primary">
                    {nextWedding.booking.days_until}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextWedding.booking.days_until === 1 ? "day" : "days"} to go
                  </p>
                </div>
              </div>

              {/* Incomplete tasks */}
              {nextWedding.incompleteTasks.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Still to do
                  </p>
                  {nextWedding.incompleteTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm rounded-md px-3 py-2 bg-background/60"
                    >
                      <span>{task.title}</span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "d MMM")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary/80 font-medium">
                  ✓ All caught up for this wedding.
                </p>
              )}

              <Link
                href={`/bookings/${nextWedding.booking.id}`}
                className="text-xs text-primary hover:underline"
              >
                Open booking →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <Camera className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-muted-foreground">
                No upcoming weddings scheduled. Time to fill that calendar!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Editing Bench ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Editing Bench
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {editingBench.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              🎉 You&apos;re all caught up — no weddings in the darkroom right now!
            </p>
          ) : (
            <div className="space-y-4">
              {editingBench.map(({ booking, stages, progress }) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="block rounded-md p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {booking.client_name_primary}
                        {booking.client_name_secondary &&
                          ` & ${booking.client_name_secondary}`}
                      </p>
                      {booking.event_date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.event_date), "d MMMM yyyy")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Stage labels */}
                  {stages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stages.map((stage) => (
                        <span
                          key={stage.id}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            stage.completed_at
                              ? "bg-primary/10 text-primary border-primary/20 line-through"
                              : "bg-muted text-muted-foreground border-muted"
                          }`}
                        >
                          {stage.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {stages.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No stages configured.{" "}
                      <Link
                        href="/settings"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Set up your workflow →
                      </Link>
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daily Tasks ───────────────────────────────────────────── */}
      <CommandCenterTasksPanel
        thisWeek={tasks.thisWeek}
        upcoming={tasks.upcoming}
        bookingOptions={bookingOptions}
      />

      {/* ── New Inquiries ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              New Inquiries
            </CardTitle>
            {inquiryBookings.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                {inquiryBookings.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {inquiryBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No open inquiries right now.
            </p>
          ) : (
            <div className="space-y-1">
              {inquiryBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {booking.client_name_primary}
                      {booking.client_name_secondary &&
                        ` & ${booking.client_name_secondary}`}
                    </p>
                    {booking.event_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.event_date), "d MMMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(booking.created_at), "d MMM")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
