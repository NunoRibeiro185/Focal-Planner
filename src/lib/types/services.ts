import type { Database } from "./supabase";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Service = Row<"services">;
export type BookingService = Row<"booking_services">;
export type PackageTemplateService = Row<"package_template_services">;

export interface PackageTemplateWithServices {
  id: string;
  photographer_id: string;
  name: string;
  archived: boolean;
  created_at: string;
  base_price: number | null;
  currency: string | null;
  services: Array<{
    service_id: string;
    default_quantity: number;
    sort_order: number;
    service: Pick<Service, "id" | "name" | "description" | "unit_price" | "track_completion">;
  }>;
}
