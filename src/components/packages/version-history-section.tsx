"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Star, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { setCurrentVersion, toggleVersionArchived } from "@/lib/actions/packages";
import { formatCurrency } from "@/lib/utils/currency";
import type { PackageVersionWithBookingCount } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VersionHistorySectionProps {
  templateId: string;
  currentVersionId: string | null;
  versions: PackageVersionWithBookingCount[];
}

export function VersionHistorySection({
  templateId,
  currentVersionId,
  versions,
}: VersionHistorySectionProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (versions.length <= 1) return null;

  const activeVersions = versions.filter((v) => !v.archived);
  const archivedVersions = versions.filter((v) => v.archived);
  const visibleVersions = showArchived ? versions : activeVersions;

  function handleSetCurrent(versionId: string) {
    startTransition(async () => {
      try {
        await setCurrentVersion(templateId, versionId);
        toast.success("Current version updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update current version");
      }
    });
  }

  function handleToggleArchive(versionId: string, archive: boolean) {
    startTransition(async () => {
      try {
        await toggleVersionArchived(versionId, archive);
        toast.success(archive ? "Version archived" : "Version restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update version");
      }
    });
  }

  return (
    <div className="mt-5 pt-4 border-t">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-3">
        Version history
      </p>

      <div className="space-y-0">
        {visibleVersions.map((version) => {
          const isCurrent = version.id === currentVersionId;
          return (
            <div
              key={version.id}
              className={cn(
                "flex items-center gap-2 py-1.5 min-w-0",
                version.archived && "opacity-40"
              )}
            >
              {/* Name + current badge */}
              <div className="flex items-baseline gap-1.5 w-[130px] sm:w-[160px] shrink-0 min-w-0">
                <span
                  className={cn(
                    "text-xs truncate",
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {version.version_name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-primary font-medium shrink-0">current</span>
                )}
              </div>

              {/* Price */}
              <span className="text-xs text-muted-foreground tabular-nums w-[72px] shrink-0">
                {formatCurrency(version.base_price, version.currency)}
              </span>

              {/* Booking count */}
              <span className="text-xs text-muted-foreground/50 w-[72px] shrink-0 hidden sm:block">
                {version.booking_count > 0
                  ? `${version.booking_count} booking${version.booking_count !== 1 ? "s" : ""}`
                  : ""}
              </span>

              {/* Created date */}
              <span className="text-xs text-muted-foreground/40 w-[52px] shrink-0 hidden md:block">
                {format(new Date(version.created_at), "MMM yyyy")}
              </span>

              {/* Actions */}
              {!isCurrent && (
                <div className="flex items-center gap-3 ml-auto shrink-0">
                  {!version.archived && (
                    <button
                      type="button"
                      onClick={() => handleSetCurrent(version.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <Star className="h-3 w-3" />
                      Set current
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(version.id, !version.archived)}
                    disabled={isPending}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50"
                  >
                    {version.archived ? (
                      <>
                        <ArchiveRestore className="h-3 w-3" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-3 w-3" />
                        Archive
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {archivedVersions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((p) => !p)}
          className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-2"
        >
          {showArchived ? "Hide archived" : `${archivedVersions.length} archived`}
        </button>
      )}
    </div>
  );
}
