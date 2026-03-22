/**
 * Builds the rows to insert into package_version_custom_fields.
 * Only includes fields that have a non-empty value:
 * - checkbox: value_bool must be true
 * - text: value_text must be a non-empty string
 * Fields with empty/null/false values are omitted to keep snapshots lean.
 */
export function buildCustomFieldInserts(
  packageVersionId: string,
  photographerId: string,
  customFieldValues: Array<{
    field_definition_id: string;
    value_text: string | null;
    value_bool: boolean | null;
  }>
): Array<{
  package_version_id: string;
  field_definition_id: string;
  photographer_id: string;
  value_text: string | null;
  value_bool: boolean | null;
}> {
  return customFieldValues
    .filter((v) => {
      const hasText = typeof v.value_text === "string" && v.value_text.trim() !== "";
      const hasBool = v.value_bool === true;
      return hasText || hasBool;
    })
    .map((v) => ({
      package_version_id: packageVersionId,
      field_definition_id: v.field_definition_id,
      photographer_id: photographerId,
      value_text: v.value_text ?? null,
      value_bool: v.value_bool ?? null,
    }));
}
