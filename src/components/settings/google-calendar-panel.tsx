"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Load calendar list when connected but no calendar selected yet
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sync your shoots and personal events to Google Calendar automatically.
        </p>

        {/* Connection status feedback */}
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
          /* Not connected */
          <Button onClick={handleConnect} disabled={isPending} variant="outline">
            {isPending ? "Redirecting…" : "Connect Google Calendar"}
          </Button>
        ) : !hasCalendarSelected ? (
          /* Connected, no calendar chosen yet */
          <div className="space-y-3">
            <p className="text-sm font-medium">Choose which calendar to sync to:</p>
            {loadingCalendars ? (
              <p className="text-sm text-muted-foreground">Loading calendars…</p>
            ) : (
              <Select onValueChange={handleSelectCalendar} disabled={isPending}>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisconnectDialogOpen(true)}
              disabled={isPending}
              className="text-muted-foreground"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          /* Connected + calendar selected */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Syncing to</p>
                <p className="text-sm text-muted-foreground">
                  {token.selected_calendar_name ?? token.selected_calendar_id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Reset selected calendar so the picker re-appears
                  startTransition(async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const sb = createClient();
                    const { data: { user } } = await sb.auth.getUser();
                    if (user) {
                      await sb
                        .from("google_calendar_tokens")
                        .update({ selected_calendar_id: null, selected_calendar_name: null })
                        .eq("photographer_id", user.id);
                      window.location.reload();
                    }
                  });
                }}
                disabled={isPending}
              >
                Change calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisconnectDialogOpen(true)}
                disabled={isPending}
                className="text-muted-foreground"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Disconnect Google Calendar</DialogTitle>
          <DialogDescription>
            What should happen to the events that were synced to your Google Calendar?
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
