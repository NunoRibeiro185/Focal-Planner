"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Star, Archive, ArchiveRestore, Clock, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [expanded, setExpanded] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (versions.length <= 1) return null;

  const activeVersions = versions.filter((v) => !v.archived);
  const archivedVersions = versions.filter((v) => v.archived);
  const displayedVersions = showArchived ? versions : activeVersions;

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

  function handleToggleArchive(versionId: string, archived: boolean) {
    startTransition(async () => {
      try {
        await toggleVersionArchived(versionId, archived);
        toast.success(archived ? "Version archived" : "Version restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update version");
      }
    });
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {versions.length} version{versions.length !== 1 ? "s" : ""}
      </button>

      {/* Animated expand using grid-template-rows */}
      <div
        className="grid transition-all duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-3 space-y-1">
            {displayedVersions.map((version) => {
              const isCurrent = version.id === currentVersionId;
              const isExpanded = expandedVersionId === version.id;

              return (
                <div
                  key={version.id}
                  className={cn(
                    "rounded-md transition-colors",
                    version.archived ? "opacity-50" : "",
                    isExpanded ? "bg-muted/40" : ""
                  )}
                >
                  {/* Version row */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedVersionId(isExpanded ? null : version.id)
                    }
                    className="flex items-center justify-between w-full px-2 py-1.5 text-left hover:bg-muted/30 rounded-md transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "text-sm truncate",
                        isCurrent ? "font-medium" : "text-muted-foreground"
                      )}>
                        {version.version_name}
                      </span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
                          current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {version.booking_count > 0 && (
                        <span className="text-xs text-muted-foreground/70 tabular-nums">
                          {version.booking_count} booking{version.booking_count !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/50">
                        {format(new Date(version.created_at), "MMM yyyy")}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-3">
                      {/* Version details (read-only) */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Banknote className="h-3 w-3 shrink-0" />
                          <span>{formatCurrency(version.base_price, version.currency)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{version.hours_of_coverage}h coverage</span>
                        </div>
                        {version.description && (
                          <p className="col-span-2 text-xs text-muted-foreground mt-0.5 italic">
                            {version.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isCurrent && !version.archived && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={isPending}
                            onClick={() => handleSetCurrent(version.id)}
                          >
                            <Star className="h-3 w-3" />
                            Set as current
                          </Button>
                        )}
                        {!isCurrent && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground"
                            disabled={isPending}
                            onClick={() => handleToggleArchive(version.id, !version.archived)}
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
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {archivedVersions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived((p) => !p)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1 px-2"
              >
                {showArchived
                  ? "Hide archived"
                  : `${archivedVersions.length} archived`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
