import Link from "next/link";
import {
  Clock,
  Camera,
  Film,
  Video,
  Users,
  BookOpen,
  Clapperboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { Check } from "lucide-react";
import { DeletePackageButton } from "./delete-package-button";
import type { PackageTemplateWithVersionAndCustomFields } from "@/lib/types";

interface PackageCardProps {
  pkg: PackageTemplateWithVersionAndCustomFields;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const v = pkg.current_version;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{pkg.name}</CardTitle>
          {v && (
            <Badge variant="outline" className="shrink-0 text-xs">
              v{v.version_number}
            </Badge>
          )}
        </div>
        {v && (
          <>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(v.base_price, v.currency)}
            </p>
            {v.description && (
              <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
            )}
          </>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {v && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{v.hours_of_coverage}h coverage</span>
            </div>

            {/* Custom fields */}
            {v.custom_fields && v.custom_fields.length > 0 && (
              <div className="space-y-1">
                {v.custom_fields.map((cf) => (
                  <div key={cf.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {cf.definition.field_type === "checkbox" ? (
                      <>
                        {cf.value_bool ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : null}
                        <span>{cf.definition.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground">{cf.definition.label}:</span>
                        <span>{cf.value_text}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {v.edited_photos_count && v.edited_photos_count > 0 ? (
                <DeliverablePill icon={<Camera className="h-3 w-3" />} label={`${v.edited_photos_count} photos`} />
              ) : null}
              {v.wedding_album && (
                <DeliverablePill icon={<BookOpen className="h-3 w-3" />} label="Album" />
              )}
              {v.film_rolls_count && v.film_rolls_count > 0 ? (
                <DeliverablePill icon={<Film className="h-3 w-3" />} label={`${v.film_rolls_count} film roll${v.film_rolls_count > 1 ? "s" : ""}`} />
              ) : null}
              {v.video && (
                <DeliverablePill icon={<Video className="h-3 w-3" />} label="Video" />
              )}
              {v.short_clips && (
                <DeliverablePill icon={<Clapperboard className="h-3 w-3" />} label="Short clips" />
              )}
              {v.second_shooter && (
                <DeliverablePill icon={<Users className="h-3 w-3" />} label="2nd shooter" />
              )}
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/packages/${pkg.id}/edit`}>Edit</Link>
          </Button>
          <DeletePackageButton templateId={pkg.id} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeliverablePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
      {icon}
      {label}
    </span>
  );
}
