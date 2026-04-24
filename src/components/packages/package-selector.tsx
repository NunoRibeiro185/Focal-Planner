"use client";

import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export interface PackageForSelector {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  description: string | null;
  hours_of_coverage: number;
  custom_fields: Array<{
    id: string;
    label: string;
    field_type: string;
    value_bool: boolean | null;
    value_text: string | null;
  }>;
}

interface PackageSelectorProps {
  packages: PackageForSelector[];
  showPrices: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function PackageSelector({
  packages,
  showPrices,
  value,
  onChange,
}: PackageSelectorProps) {
  const hasSelection = value !== null;

  return (
    <div>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          alignItems: "start",
        }}
      >
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            showPrices={showPrices}
            selected={value === pkg.id}
            dimmed={hasSelection && value !== pkg.id}
            onSelect={() => onChange(value === pkg.id ? null : pkg.id)}
          />
        ))}
      </div>

      <div className="mt-5 text-center min-h-[1.5rem]">
        {hasSelection ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Clear selection — I&apos;ll decide later
          </button>
        ) : (
          <p className="text-xs text-muted-foreground/40">
            Select a package, or leave blank to decide later.
          </p>
        )}
      </div>
    </div>
  );
}

interface PackageCardProps {
  pkg: PackageForSelector;
  showPrices: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}

function PackageCard({ pkg, showPrices, selected, dimmed, onSelect }: PackageCardProps) {
  const checkboxFields = pkg.custom_fields.filter(
    (cf) => cf.field_type === "checkbox" && cf.value_bool
  );
  const textFields = pkg.custom_fields.filter(
    (cf) => cf.field_type === "text" && cf.value_text
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "text-left w-full overflow-hidden rounded-sm flex flex-col",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "ring-2 ring-primary scale-[1.02] border border-primary/20 bg-card shadow-sm"
          : dimmed
          ? "border border-border/40 scale-[0.97] opacity-55 bg-card"
          : "border border-border/60 bg-card hover:border-border hover:scale-[1.01] hover:shadow-sm"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Image placeholder — 3:4 ratio */}
      <div
        className="w-full shrink-0"
        style={{
          aspectRatio: "3 / 4",
          backgroundColor: selected ? "oklch(89% 0.022 70)" : "oklch(91% 0.012 75)",
          transition: "background-color 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Card content */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="text-base font-semibold tracking-[-0.01em] leading-snug"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {pkg.name}
        </h3>

        {pkg.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 max-w-[45ch]">
            {pkg.description}
          </p>
        )}

        <hr className="border-border/50 my-3" />

        {showPrices && (
          <p
            className="text-xl font-semibold text-primary leading-none"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(pkg.base_price, pkg.currency)}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{pkg.hours_of_coverage}h coverage</span>
        </div>

        {(checkboxFields.length > 0 || textFields.length > 0) && (
          <ul className="flex flex-col gap-1 mt-2.5">
            {checkboxFields.map((cf) => (
              <li
                key={cf.id}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <span className="mt-[5px] w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                {cf.label}
              </li>
            ))}
            {textFields.map((cf) => (
              <li
                key={cf.id}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <span className="mt-[5px] w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                {cf.label}: {cf.value_text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selection indicator — fixed height to prevent layout shift */}
      <div
        className={cn(
          "px-4 py-2 flex items-center justify-center border-t",
          "transition-colors duration-200",
          selected ? "border-primary/15 bg-primary/[0.04]" : "border-transparent"
        )}
      >
        <span
          className={cn(
            "text-[9px] uppercase tracking-[0.12em] font-semibold",
            "transition-all duration-200",
            selected ? "text-primary opacity-60" : "text-transparent select-none"
          )}
        >
          Selected
        </span>
      </div>
    </button>
  );
}
