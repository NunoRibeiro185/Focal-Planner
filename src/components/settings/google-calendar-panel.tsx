"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  initiateGoogleCalendarConnect,
  disconnectGoogleCalendar,
  selectGoogleCalendar,
  listGoogleCalendars,
} from "@/lib/actions/google-calendar";
import type { GoogleCalendarToken } from "@/lib/types";
import { CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface GoogleCalendarPanelProps {
  token: GoogleCalendarToken | null;
  connectionStatus?: "connected" | "error" | null;
}

interface CalendarOption {
  id: string;
  summary: string;
}

export function GoogleCalendarPanel({
  token,
  connectionStatus,
}: GoogleCalendarPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const isConnected = !!token;
  const hasCalendarSelected = !!token?.selected_calendar_id;

  useEffect(() => {
    if (isConnected && !hasCalendarSelected) {
      setLoadingCalendars(true);
      listGoogleCalendars()
        .then(setCalendars)
        .catch(() => setCalendars([]))
        .finally(() => setLoadingCalendars(false));
    }
  }, [isConnected, hasCalendarSelected]);

  function handleConnect() {
    startTransition(async () => {
      const url = await initiateGoogleCalendarConnect();
      window.location.href = url;
    });
  }

  function handleDisconnect(deleteEvents: boolean) {
    setDisconnectDialogOpen(false);
    startTransition(async () => {
      await disconnectGoogleCalendar(deleteEvents);
    });
  }

  function handleSelectCalendar(calendarId: string) {
    const cal = calendars.find((c) => c.id === calendarId);
    if (!cal) return;
    startTransition(async () => {
      await selectGoogleCalendar(cal.id, cal.summary);
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Google Calendar</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Your bookings will automatically appear in Google Calendar.
        </p>

        {connectionStatus === "connected" && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Connected successfully
          </div>
        )}
        {connectionStatus === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Connection failed — please try again
          </div>
        )}

        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isPending}
            variant="outline"
          >
            {isPending ? "Redirecting…" : "Connect Google Calendar"}
          </Button>
        ) : !hasCalendarSelected ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Pick a calendar to sync your bookings to:</p>
            {loadingCalendars ? (
              <p className="text-sm text-muted-foreground">Loading calendars…</p>
            ) : (
              <Select
                onValueChange={handleSelectCalendar}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              onClick={() => setDisconnectDialogOpen(true)}
              disabled={isPending}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Syncing bookings to</p>
                <p className="text-sm text-muted-foreground">
                  {token.selected_calendar_name ?? token.selected_calendar_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  startTransition(async () => {
                    const { createClient } = await import(
                      "@/lib/supabase/client"
                    );
                    const sb = createClient();
                    const {
                      data: { user },
                    } = await sb.auth.getUser();
                    if (user) {
                      await sb
                        .from("google_calendar_tokens")
                        .update({
                          selected_calendar_id: null,
                          selected_calendar_name: null,
                        })
                        .eq("photographer_id", user.id);
                      window.location.reload();
                    }
                  });
                }}
                disabled={isPending}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Change calendar
              </button>
              <button
                onClick={() => setDisconnectDialogOpen(true)}
                disabled={isPending}
                className="text-sm text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect Google Calendar</DialogTitle>
            <DialogDescription>
              What should happen to the events that were synced to your Google
              Calendar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => handleDisconnect(false)}
              disabled={isPending}
              className="w-full"
            >
              Keep events in Google Calendar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDisconnect(true)}
              disabled={isPending}
              className="w-full"
            >
              Delete synced events
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
