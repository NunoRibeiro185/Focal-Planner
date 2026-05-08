import type { InquiryFormField, AnswerPayload, InquiryFieldMapping } from "@/lib/types/inquiry-forms";

export function isMappedField(field: InquiryFormField): boolean {
  return field.field_mapping !== null;
}

export function extractMappedValues(
  fields: InquiryFormField[],
  answers: Record<string, string>
): Partial<Record<InquiryFieldMapping, string>> {
  const result: Partial<Record<InquiryFieldMapping, string>> = {};
  for (const field of fields) {
    if (!field.field_mapping) continue;
    const value = answers[field.id];
    if (value && value.trim() !== "") {
      result[field.field_mapping] = value;
    }
  }
  return result;
}

export function buildAnswerPayloads(
  fields: InquiryFormField[],
  answers: Record<string, string>
): AnswerPayload[] {
  return fields
    .filter((f) => !f.field_mapping)
    .flatMap((f) => {
      const value = answers[f.id];
      if (!value || value.trim() === "") return [];
      return [{ question_text: f.label, answer_value: value, sort_order: f.sort_order }];
    });
}

export function normalizeFormUrl(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
