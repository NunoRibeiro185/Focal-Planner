import { describe, it, expect } from "vitest";
import { buildCustomFieldInserts } from "@/lib/utils/custom-fields";

const VERSION_ID = "00000000-0000-0000-0000-000000000001";
const PHOTO_ID = "00000000-0000-0000-0000-000000000002";
const FIELD_A = "00000000-0000-0000-0000-000000000010";
const FIELD_B = "00000000-0000-0000-0000-000000000011";

describe("buildCustomFieldInserts", () => {
  it("returns empty array when given no fields", () => {
    expect(buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [])).toHaveLength(0);
  });

  it("includes a checkbox field with value_bool: true", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_A, value_text: null, value_bool: true },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].field_definition_id).toBe(FIELD_A);
    expect(result[0].value_bool).toBe(true);
  });

  it("excludes a checkbox field with value_bool: false", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_A, value_text: null, value_bool: false },
    ]);
    expect(result).toHaveLength(0);
  });

  it("excludes a checkbox field with value_bool: null", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_A, value_text: null, value_bool: null },
    ]);
    expect(result).toHaveLength(0);
  });

  it("includes a text field with a non-empty value", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_B, value_text: "hello", value_bool: null },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].value_text).toBe("hello");
  });

  it("excludes a text field with an empty string", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_B, value_text: "", value_bool: null },
    ]);
    expect(result).toHaveLength(0);
  });

  it("excludes a text field with a whitespace-only string", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_B, value_text: "   ", value_bool: null },
    ]);
    expect(result).toHaveLength(0);
  });

  it("excludes a text field with null value", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_B, value_text: null, value_bool: null },
    ]);
    expect(result).toHaveLength(0);
  });

  it("includes only non-empty fields from a mixed array", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_A, value_text: null, value_bool: true },   // ✓
      { field_definition_id: FIELD_B, value_text: "", value_bool: null },       // ✗
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].field_definition_id).toBe(FIELD_A);
  });

  it("sets the correct package_version_id and photographer_id on each row", () => {
    const result = buildCustomFieldInserts(VERSION_ID, PHOTO_ID, [
      { field_definition_id: FIELD_A, value_text: null, value_bool: true },
    ]);
    expect(result[0].package_version_id).toBe(VERSION_ID);
    expect(result[0].photographer_id).toBe(PHOTO_ID);
  });
});
