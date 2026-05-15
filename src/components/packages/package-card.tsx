import Link from "next/link";
import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { DeletePackageButton } from "./delete-package-button";
import type { PackageTemplateForList } from "@/lib/types";

export function PackageCard({ pkg }: { pkg: PackageTemplateForList }) {
  const v = pkg.current_version;

  return (
    <article className="group overflow-hidden rounded-sm border border-border/60 bg-card flex flex-col">
      {/* Main content */}
      <div className="flex flex-col flex-1 px-5 pt-6 pb-3">
        {/* Version name */}
        {v && (
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/35 font-medium mb-2">
            {v.version_name}
          </p>
        )}

        {/* Title */}
        <h2
          className="text-lg font-semibold tracking-[-0.01em] leading-snug"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {pkg.name}
        </h2>

        {/* Description */}
        {v?.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-[48ch]">
            {v.description}
          </p>
        )}

        {v ? (
          <>
            <hr className="border-border/50 my-4" />

            {/* Price */}
            <p
              className="text-2xl font-semibold text-primary leading-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {formatCurrency(v.base_price, v.currency)}
            </p>

            {/* Hours */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{v.hours_of_coverage}h coverage</span>
            </div>

          </>
        ) : (
          <p className="text-sm text-muted-foreground/40 mt-3 italic">No version set</p>
        )}
      </div>

      {/* Hover control bar — always in DOM, fades in on hover */}
      <div className="border-t border-border/40 px-5 py-3 flex items-center gap-5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
        <Link
          href={`/packages/${pkg.id}/edit`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          New version
        </Link>
        <DeletePackageButton templateId={pkg.id} />
      </div>
    </article>
  );
}
