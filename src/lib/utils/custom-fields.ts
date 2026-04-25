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
    .filter((v) => v.value_bool === true)
    .map((v) => ({
      package_version_id: packageVersionId,
      field_definition_id: v.field_definition_id,
      photographer_id: photographerId,
      value_text: null,
      value_bool: true,
    }));
}
