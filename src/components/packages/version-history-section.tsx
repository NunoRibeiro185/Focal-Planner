"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Star, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (versions.length <= 1) return null;

  const previousCount = versions.length - 1;
  const activeVersions = versions.filter((v) => !v.archived);
  const archivedVersions = versions.filter((v) => v.archived);
  const visibleVersions = showArchived ? versions : activeVersions;

  function handleSetCurrent(versionId: string) {
    startTransition(async () => {
      try {
        await setCurrentVersion(templateId, versionId);
        toast.success("Active version updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update active version");
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
    <div className="mt-4 pt-3 border-t">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
        {isOpen
          ? "Hide versions"
          : `${previousCount} previous version${previousCount !== 1 ? "s" : ""}`}
      </button>

      {/* Smooth expand using grid-template-rows */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="pt-3 space-y-0.5">
            {visibleVersions.map((version) => {
              const isCurrent = version.id === currentVersionId;
              return (
                <div
                  key={version.id}
                  className={cn(
                    "group/row flex items-center gap-2 py-1.5 px-2.5 rounded-sm",
                    isCurrent ? "bg-primary/[0.06]" : "hover:bg-muted/40",
                    version.archived && "opacity-40"
                  )}
                >
                  {/* Left: name + meta stacked */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "text-xs truncate",
                          isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {version.version_name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] uppercase tracking-widest text-primary font-semibold shrink-0 opacity-60">
                          active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {version.booking_count > 0 && (
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                          {version.booking_count} booking{version.booking_count !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/30">
                        {format(new Date(version.created_at), "MMM yy")}
                      </span>
                    </div>
                  </div>

                  {/* Right: price + icon actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(version.base_price, version.currency)}
                    </span>

                    {/* Icon-only actions, revealed on hover */}
                    {!isCurrent && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        {!version.archived && (
                          <button
                            type="button"
                            onClick={() => handleSetCurrent(version.id)}
                            disabled={isPending}
                            title="Make active"
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 rounded-sm hover:bg-muted"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(version.id, !version.archived)}
                          disabled={isPending}
                          title={version.archived ? "Restore" : "Archive"}
                          className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 rounded-sm hover:bg-muted"
                        >
                          {version.archived ? (
                            <ArchiveRestore className="h-3 w-3" />
                          ) : (
                            <Archive className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {archivedVersions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived((p) => !p)}
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-1 ml-2.5"
              >
                {showArchived ? "Hide archived" : `${archivedVersions.length} archived`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
