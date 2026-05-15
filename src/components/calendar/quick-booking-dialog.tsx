"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { createBooking } from "@/lib/actions/bookings";
import { quickBookingFormSchema, type QuickBookingFormValues } from "@/lib/types/forms";
import type { PackageTemplateWithVersion } from "@/lib/types";

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  packages: PackageTemplateWithVersion[];
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  defaultDate,
  packages,
}: QuickBookingDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuickBookingFormValues>({
    resolver: zodResolver(quickBookingFormSchema),
    defaultValues: {
      client_name_primary: "",
      event_date: defaultDate ?? "",
      package_template_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        client_name_primary: "",
        event_date: defaultDate ?? "",
        package_template_id: "",
      });
    }
  }, [open, defaultDate, form]);

  function onSubmit(values: QuickBookingFormValues) {
    startTransition(async () => {
      try {
        // Reuse the existing createBooking action; it redirects after creation.
        // We call it with minimal fields — the rest default on the server.
        await createBooking(
          {
            client_name_primary: values.client_name_primary,
            event_date: values.event_date,
            client_name_secondary: null,
            client_email: null,
            client_phone: null,
            lead_source: null,
            location: null,
            notes: null,
            discount_amount: 0,
            deposit_amount: null,
            payment_due_date: null,
          },
          [],
          [],
          false,
          false
        );
        // createBooking redirects to /bookings/[id], so this line is never reached.
        // onOpenChange(false) would be redundant but harmless.
      } catch {
        // redirect() throws — that is expected behaviour, not an error
      }
    });
  }

  const activePackages = packages.filter((p) => !p.archived && p.current_version_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription className="sr-only">Fill in the details to create a new booking.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Client name */}
          <div className="space-y-1.5">
            <Label htmlFor="qb-client">Client name</Label>
            <Input
              id="qb-client"
              {...form.register("client_name_primary")}
              placeholder="e.g. Emma & James"
            />
            {form.formState.errors.client_name_primary && (
              <p className="text-xs text-destructive">
                {form.formState.errors.client_name_primary.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="qb-date">Event date</Label>
            <Input id="qb-date" type="date" {...form.register("event_date")} />
            {form.formState.errors.event_date && (
              <p className="text-xs text-destructive">
                {form.formState.errors.event_date.message}
              </p>
            )}
          </div>

          {/* Package */}
          <div className="space-y-1.5">
            <Label>Package</Label>
            <Select
              onValueChange={(v) => form.setValue("package_template_id", v)}
              value={form.watch("package_template_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {activePackages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.package_template_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.package_template_id.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
