export type InquiryFieldType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "number"
  | "date";

export type InquiryFieldMapping =
  | "client_name_secondary"
  | "client_phone"
  | "event_date"
  | "venue_name"
  | "venue_address"
  | "location"
  | "notes"
  | "package_template_id";

export interface InquiryFormFieldOption {
  id: string;
  field_id: string;
  label: string;
  sort_order: number;
}

export interface InquiryFormField {
  id: string;
  form_id: string;
  photographer_id: string;
  field_type: InquiryFieldType;
  label: string;
  helper_text: string | null;
  is_required: boolean;
  sort_order: number;
  field_mapping: InquiryFieldMapping | null;
  options: InquiryFormFieldOption[];
}

export interface InquiryForm {
  id: string;
  photographer_id: string;
  name: string;
  form_url: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryFormWithFields extends InquiryForm {
  fields: InquiryFormField[];
  allowed_package_ids: string[];
}

export interface InquiryAnswer {
  id: string;
  booking_id: string;
  question_text: string;
  answer_value: string;
  sort_order: number;
  created_at: string;
}

/** Shape of one answer as sent from the public form to the server action */
export interface AnswerPayload {
  question_text: string;
  answer_value: string;
  sort_order: number;
}

/** Public form data needed to render a form to a visitor */
export interface PublicFormDefinition {
  form: Pick<InquiryForm, "id" | "name" | "form_url">;
  photographerName: string;
  photographerSlug: string;
  fields: InquiryFormField[];
  allowed_package_ids: string[];
  packages: PublicPackageOption[];
}

export interface PublicPackageOption {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  description: string | null;
  hours_of_coverage: number;
}
