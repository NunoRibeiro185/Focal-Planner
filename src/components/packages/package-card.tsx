import Link from "next/link";
import { Clock, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { DeletePackageButton } from "./delete-package-button";
import { VersionHistorySection } from "./version-history-section";
import type { PackageTemplateForList } from "@/lib/types";

interface PackageCardProps {
  pkg: PackageTemplateForList;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const v = pkg.current_version;

  return (
    <article className="py-7">
      <div className="flex items-start justify-between gap-6 flex-col sm:flex-row">
        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
            <h2
              className="text-xl font-semibold tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {pkg.name}
            </h2>
            {v && (
              <span className="text-xs text-muted-foreground">{v.version_name}</span>
            )}
          </div>

          {v?.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[55ch] mt-1 mb-3">
              {v.description}
            </p>
          )}

          {v && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{v.hours_of_coverage}h coverage</span>
              </div>
              {v.custom_fields
                ?.filter((cf) => cf.definition.field_type === "checkbox" && cf.value_bool)
                .map((cf) => (
                  <div key={cf.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{cf.definition.label}</span>
                  </div>
                ))}
              {v.custom_fields
                ?.filter((cf) => cf.definition.field_type === "text" && cf.value_text)
                .map((cf) => (
                  <span key={cf.id} className="text-xs text-muted-foreground">
                    {cf.definition.label}: {cf.value_text}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Price + actions */}
        <div className="flex sm:flex-col sm:items-end items-center justify-between w-full sm:w-auto sm:shrink-0 sm:pt-0.5">
          {v ? (
            <p
              className="text-2xl font-semibold text-primary leading-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {formatCurrency(v.base_price, v.currency)}
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}

          <div className="flex items-center gap-4 sm:mt-4">
            <Link
              href={`/packages/${pkg.id}/edit`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              New version
            </Link>
            <DeletePackageButton templateId={pkg.id} />
          </div>
        </div>
      </div>

      <VersionHistorySection
        templateId={pkg.id}
        currentVersionId={pkg.current_version_id}
        versions={pkg.all_versions}
      />
    </article>
  );
}
