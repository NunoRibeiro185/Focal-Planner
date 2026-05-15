export interface Service {
  id: string;
  photographer_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  track_completion: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface BookingService {
  id: string;
  booking_id: string;
  photographer_id: string;
  service_id: string | null;
  name_snapshot: string;
  description_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  track_completion_snapshot: boolean;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface PackageTemplateService {
  id: string;
  package_template_id: string;
  service_id: string;
  photographer_id: string;
  default_quantity: number;
  sort_order: number;
  created_at: string;
}

export interface PackageTemplateWithServices {
  id: string;
  photographer_id: string;
  name: string;
  archived: boolean;
  created_at: string;
  services: Array<{
    service_id: string;
    default_quantity: number;
    sort_order: number;
    service: Pick<Service, "id" | "name" | "description" | "unit_price" | "track_completion">;
  }>;
}
