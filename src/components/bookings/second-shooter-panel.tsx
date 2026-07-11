"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Check,
  X,
  Pencil,
  Trash2,
  Lock,
  Copy,
  Link,
  MailCheck,
  Clock,
} from "lucide-react";
import {
  secondShooterPanelSchema,
  secondShooterPasswordSchema,
  type SecondShooterPanelValues,
  type SecondShooterPasswordValues,
} from "@/lib/types/forms";
import {
  saveSecondShooterSettings,
  setSecondShooterPassword,
  removeSecondShooterPassword,
  inviteSecondShooter,
  removeSecondShooter,
} from "@/lib/actions/second-shooter";
import type { Booking } from "@/lib/types";

interface SecondShooterPanelProps {
  booking: Booking;
  bookingId: string;
}

export function SecondShooterPanel({ booking, bookingId }: SecondShooterPanelProps) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [invitePending, startInviteTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [inviteResult, setInviteResult] = useState<{ foundAccount: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/second-shooter/${bookingId}`
      : `/second-shooter/${bookingId}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRemoveConfirm() {
    setConfirmingRemove(false);
    startRemoveTransition(async () => {
      try {
        await removeSecondShooter(bookingId);
      } catch {
        toast.error("Couldn't remove second shooter — try again");
      }
    });
  }

  return (
    <>
      <Dialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove second shooter?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will revoke all access for{" "}
            <strong>{booking.second_shooter_email ?? "this second shooter"}</strong>. They won&apos;t be able to view the booking page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingRemove(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm} disabled={removePending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Second Shooter
            </CardTitle>
            {(booking.second_shooter_email || booking.second_shooter_id) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmingRemove(true)}
                disabled={removePending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </CardHeader>

      <CardContent className="space-y-4">
        {/* Settings section */}
        {editingSettings ? (
          <SettingsForm
            booking={booking}
            bookingId={bookingId}
            onDone={() => setEditingSettings(false)}
          />
        ) : (
          <SettingsView
            booking={booking}
            onEdit={() => setEditingSettings(true)}
          />
        )}

        <Separator />

        {/* Invite section (account holders) */}
        <InviteSection
          booking={booking}
          bookingId={bookingId}
          invitePending={invitePending}
          startInviteTransition={startInviteTransition}
          inviteResult={inviteResult}
          setInviteResult={setInviteResult}
        />

        <Separator />

        {/* Public page access */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Public page access
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={publicUrl}
              readOnly
              className="h-7 text-xs font-mono bg-muted/30"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {editingPassword ? (
            <PasswordForm
              bookingId={bookingId}
              hasPassword={!!booking.second_shooter_password_hash}
              onDone={() => setEditingPassword(false)}
            />
          ) : (
            <div className="flex items-center gap-2">
              {booking.second_shooter_password_hash ? (
                <>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Password set
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setEditingPassword(true)}
                  >
                    Change
                  </Button>
                  <RemovePasswordButton bookingId={bookingId} />
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditingPassword(true)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Set password
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────

function SettingsView({
  booking,
  onEdit,
}: {
  booking: Booking;
  onEdit: () => void;
}) {
  const hasAnySettings =
    booking.second_shooter_email ||
    booking.second_shooter_fee != null ||
    booking.second_shooter_instructions;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Details
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {hasAnySettings ? (
        <div className="space-y-1 text-sm">
          {booking.second_shooter_email && (
            <p className="text-muted-foreground">{booking.second_shooter_email}</p>
          )}
          {booking.second_shooter_fee != null && (
            <p>
              Fee:{" "}
              <span className="font-medium">
                {booking.second_shooter_fee.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </p>
          )}
          {booking.second_shooter_instructions && (
            <p className="text-muted-foreground whitespace-pre-wrap text-xs">
              {booking.second_shooter_instructions}
            </p>
          )}
          {booking.second_shooter_show_client_contact && (
            <p className="text-xs text-muted-foreground italic">
              Client contact details visible to second shooter
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No details set — click Edit to add fee and instructions.
        </p>
      )}
    </div>
  );
}

function SettingsForm({
  booking,
  bookingId,
  onDone,
}: {
  booking: Booking;
  bookingId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SecondShooterPanelValues>({
    resolver: zodResolver(secondShooterPanelSchema) as Resolver<SecondShooterPanelValues>,
    defaultValues: {
      second_shooter_email: booking.second_shooter_email ?? null,
      second_shooter_fee: booking.second_shooter_fee ?? null,
      second_shooter_instructions: booking.second_shooter_instructions ?? null,
      second_shooter_show_client_contact: booking.second_shooter_show_client_contact,
    },
  });

  function handleSave(values: SecondShooterPanelValues) {
    startTransition(async () => {
      try {
        await saveSecondShooterSettings(bookingId, values);
        onDone();
      } catch {
        toast.error("Couldn't save settings — try again");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          placeholder="second@shooter.com"
          {...register("second_shooter_email")}
        />
        {errors.second_shooter_email && (
          <p className="text-xs text-destructive">{errors.second_shooter_email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Fee</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          {...register("second_shooter_fee")}
        />
        {errors.second_shooter_fee && (
          <p className="text-xs text-destructive">{errors.second_shooter_fee.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Instructions</Label>
        <textarea
          rows={4}
          placeholder="Shot list, logistics, expectations…"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          {...register("second_shooter_instructions")}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="show-contact"
          checked={watch("second_shooter_show_client_contact")}
          onCheckedChange={(v) => setValue("second_shooter_show_client_contact", v)}
        />
        <Label htmlFor="show-contact" className="text-xs cursor-pointer">
          Show client contact details to second shooter
        </Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Password sub-components ──────────────────────────────────────────────────

function PasswordForm({
  bookingId,
  hasPassword,
  onDone,
}: {
  bookingId: string;
  hasPassword: boolean;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SecondShooterPasswordValues>({
    resolver: zodResolver(secondShooterPasswordSchema),
  });

  function handleSave(values: SecondShooterPasswordValues) {
    startTransition(async () => {
      await setSecondShooterPassword(bookingId, values.password);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-2">
      <div className="space-y-1">
        <Input
          type="text"
          placeholder={hasPassword ? "New password" : "Set a password"}
          className="text-sm"
          autoFocus
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </form>
  );
}

function RemovePasswordButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await removeSecondShooterPassword(bookingId);
          } catch {
            toast.error("Couldn't remove password — try again");
          }
        })
      }
    >
      Remove
    </Button>
  );
}

// ─── Invite sub-component ─────────────────────────────────────────────────────

function InviteSection({
  booking,
  bookingId,
  invitePending,
  startInviteTransition,
  inviteResult,
  setInviteResult,
}: {
  booking: Booking;
  bookingId: string;
  invitePending: boolean;
  startInviteTransition: (fn: () => Promise<void>) => void;
  inviteResult: { foundAccount: boolean } | null;
  setInviteResult: (r: { foundAccount: boolean } | null) => void;
}) {
  const [email, setEmail] = useState(booking.second_shooter_email ?? "");

  function handleInvite() {
    if (!email) return;
    startInviteTransition(async () => {
      const result = await inviteSecondShooter(bookingId, email);
      setInviteResult(result);
    });
  }

  const status = booking.second_shooter_invite_status;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Focal Planner invite
      </p>

      {status === "accepted" ? (
        <p className="flex items-center gap-1.5 text-sm text-green-600">
          <MailCheck className="h-4 w-4" />
          Invite accepted — {booking.second_shooter_email}
        </p>
      ) : status === "pending" ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Invite pending — {booking.second_shooter_email}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="second@shooter.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInviteResult(null);
              }}
              className="h-7 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0"
              onClick={handleInvite}
              disabled={invitePending || !email}
            >
              <Link className="h-3.5 w-3.5" />
              Invite
            </Button>
          </div>
          {inviteResult !== null && (
            <p className="text-xs text-muted-foreground">
              {inviteResult.foundAccount
                ? "Invite sent — they'll receive an email to accept."
                : "No Focal Planner account found. They can access the booking via the password page."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
