"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Mail, Phone, Pencil, Check, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateBookingNotes, updateBookingCoreFields } from "@/lib/actions/bookings";
import {
  addItineraryStop,
  updateItineraryStop,
  deleteItineraryStop,
  reorderItineraryStop,
} from "@/lib/actions/itinerary";
import {
  clientInfoSchema,
  itineraryStopSchema,
  type ClientInfoValues,
  type ItineraryStopValues,
  LEAD_SOURCE_OPTIONS,
} from "@/lib/types/forms";
import type { BookingWithVersion, BookingItineraryStop } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

// ─── Client ───────────────────────────────────────────────────────────────────

export function ClientInfoCard({
  booking,
  bookingId,
}: {
  booking: BookingWithVersion;
  bookingId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientInfoValues>({
    resolver: zodResolver(clientInfoSchema),
    defaultValues: {
      client_name_primary: booking.client_name_primary,
      client_name_secondary: booking.client_name_secondary ?? null,
      client_email: booking.client_email ?? null,
      client_phone: booking.client_phone ?? null,
      lead_source: (booking.lead_source as ClientInfoValues["lead_source"]) ?? null,
      location: booking.location ?? null,
    },
  });

  function handleEdit() {
    reset({
      client_name_primary: booking.client_name_primary,
      client_name_secondary: booking.client_name_secondary ?? null,
      client_email: booking.client_email ?? null,
      client_phone: booking.client_phone ?? null,
      lead_source: (booking.lead_source as ClientInfoValues["lead_source"]) ?? null,
      location: booking.location ?? null,
    });
    setEditing(true);
  }

  function handleSave(values: ClientInfoValues) {
    startTransition(async () => {
      await updateBookingCoreFields(bookingId, values);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Primary name *</Label>
                <Input {...register("client_name_primary")} />
                {errors.client_name_primary && (
                  <p className="text-xs text-destructive">{errors.client_name_primary.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary name</Label>
                <Input {...register("client_name_secondary")} placeholder="Partner / Co-client" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" {...register("client_email")} />
                {errors.client_email && (
                  <p className="text-xs text-destructive">{errors.client_email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input type="tel" {...register("client_phone")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Lead source</Label>
                <Select
                  value={watch("lead_source") ?? ""}
                  onValueChange={(v) =>
                    setValue("lead_source", (v || null) as ClientInfoValues["lead_source"])
                  }
                >
                  <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location / region</Label>
                <Input {...register("location")} placeholder="e.g. Porto, Algarve" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={isPending}>
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Client
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">{booking.client_name_primary}</p>
        {booking.client_name_secondary && (
          <p className="text-muted-foreground">{booking.client_name_secondary}</p>
        )}
        {booking.client_email ? (
          <a
            href={`mailto:${booking.client_email}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5" />
            {booking.client_email}
          </a>
        ) : null}
        {booking.client_phone ? (
          <a
            href={`tel:${booking.client_phone}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
            {booking.client_phone}
          </a>
        ) : null}
        {booking.lead_source && (
          <p className="text-xs text-muted-foreground">
            Source: {LEAD_SOURCE_OPTIONS.find((o) => o.value === booking.lead_source)?.label ?? booking.lead_source}
          </p>
        )}
        {booking.location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {booking.location}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Itinerary ────────────────────────────────────────────────────────────────

function StopForm({
  defaultValues,
  onSave,
  onCancel,
  isPending,
}: {
  defaultValues: ItineraryStopValues;
  onSave: (values: ItineraryStopValues) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ItineraryStopValues>({
    resolver: zodResolver(itineraryStopSchema),
    defaultValues,
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Stop name *</Label>
        <Input {...register("name")} autoFocus placeholder="e.g. Church, Reception Hall" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Address</Label>
        <Input {...register("address")} placeholder="Full address (links to Google Maps)" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Start time</Label>
        <Input type="time" {...register("start_time")} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input {...register("notes")} placeholder="Any notes for this stop" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </form>
  );
}

function SortableStopRow({
  stop,
  onEdit,
  onDelete,
  disabled,
}: {
  stop: BookingItineraryStop;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-2 group rounded px-1 py-1.5 hover:bg-muted/40"
    >
      <button
        className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground touch-none mt-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {stop.start_time && (
            <span className="tabular-nums text-muted-foreground text-xs pt-0.5 w-10 shrink-0">
              {stop.start_time.slice(0, 5)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{stop.name}</p>
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
      <div className="flex items-center gap-1 shrink-0 invisible group-hover:visible">
        <button
          onClick={onEdit}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit stop"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete stop"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ItineraryCard({
  itineraryStops: initialStops,
  bookingId,
}: {
  itineraryStops: BookingItineraryStop[];
  bookingId: string;
}) {
  const [stops, setStops] = useState(initialStops);
  useEffect(() => { setStops(initialStops); }, [initialStops]);

  const [editingStop, setEditingStop] = useState<BookingItineraryStop | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = stops.findIndex((s) => s.id === active.id);
    const newIdx = stops.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(stops, oldIdx, newIdx);
    setStops(reordered);
    startTransition(async () => {
      await Promise.all(
        reordered.map((s, i) => reorderItineraryStop(s.id, (i + 1) * 10, bookingId))
      );
    });
  }

  function handleAdd(values: ItineraryStopValues) {
    startTransition(async () => {
      await addItineraryStop(bookingId, values);
      setShowAddDialog(false);
    });
  }

  function handleUpdate(values: ItineraryStopValues) {
    if (!editingStop) return;
    startTransition(async () => {
      await updateItineraryStop(editingStop.id, bookingId, values);
      setEditingStop(null);
    });
  }

  function handleDelete(stopId: string) {
    setStops((prev) => prev.filter((s) => s.id !== stopId));
    startTransition(async () => {
      await deleteItineraryStop(stopId, bookingId);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Itinerary
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        {stops.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {stops.map((stop) => (
                <SortableStopRow
                  key={stop.id}
                  stop={stop}
                  onEdit={() => setEditingStop(stop)}
                  onDelete={() => handleDelete(stop.id)}
                  disabled={isPending}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-muted-foreground text-sm">
            No stops yet — add venues, addresses, and times to build your day.
          </p>
        )}
      </CardContent>

      {/* Add stop dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add itinerary stop</DialogTitle>
          </DialogHeader>
          <StopForm
            defaultValues={{ name: "", address: null, start_time: null, notes: null }}
            onSave={handleAdd}
            onCancel={() => setShowAddDialog(false)}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit stop dialog */}
      <Dialog open={!!editingStop} onOpenChange={(open) => !open && setEditingStop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit stop</DialogTitle>
          </DialogHeader>
          {editingStop && (
            <StopForm
              defaultValues={{
                name: editingStop.name,
                address: editingStop.address ?? null,
                start_time: editingStop.start_time ?? null,
                notes: editingStop.notes ?? null,
              }}
              onSave={handleUpdate}
              onCancel={() => setEditingStop(null)}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function NotesCard({
  notes,
  bookingId,
}: {
  notes: string | null;
  bookingId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      // Move cursor to end
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  function handleSave() {
    startTransition(async () => {
      await updateBookingNotes(bookingId, draft.trim() || null);
      setEditing(false);
    });
  }

  function handleCancel() {
    setDraft(notes ?? "");
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notes
          </CardTitle>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder="Write observations, client preferences, special requests…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : notes ? (
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing written yet. Add requirements, preferences, or anything worth remembering about this booking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
