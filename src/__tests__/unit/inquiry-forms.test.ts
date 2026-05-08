import { describe, it, expect } from "vitest";
import {
  extractMappedValues,
  buildAnswerPayloads,
  isMappedField,
  normalizeFormUrl,
} from "@/lib/utils/inquiry-forms";
import type { InquiryFormField } from "@/lib/types/inquiry-forms";

const FIELD_ID = "00000000-0000-0000-0000-000000000001";
const FORM_ID  = "00000000-0000-0000-0000-000000000002";
const PHOTO_ID = "00000000-0000-0000-0000-000000000003";

function makeField(overrides: Partial<InquiryFormField>): InquiryFormField {
  return {
    id: FIELD_ID,
    form_id: FORM_ID,
    photographer_id: PHOTO_ID,
    field_type: "short_text",
    label: "Test field",
    helper_text: null,
    is_required: false,
    sort_order: 0,
    field_mapping: null,
    options: [],
    ...overrides,
  };
}

describe("isMappedField", () => {
  it("returns true when field_mapping is set", () => {
    expect(isMappedField(makeField({ field_mapping: "event_date" }))).toBe(true);
  });

  it("returns false when field_mapping is null", () => {
    expect(isMappedField(makeField({ field_mapping: null }))).toBe(false);
  });
});

describe("extractMappedValues", () => {
  it("extracts a single mapped field value", () => {
    const fields = [makeField({ field_mapping: "location" })];
    const answers: Record<string, string> = { [FIELD_ID]: "Porto" };
    const result = extractMappedValues(fields, answers);
    expect(result.location).toBe("Porto");
  });

  it("extracts multiple mapped fields", () => {
    const f1 = makeField({ id: "f1", field_mapping: "location" });
    const f2 = makeField({ id: "f2", field_mapping: "venue_name" });
    const answers = { f1: "Lisbon", f2: "Palacio da Regaleira" };
    const result = extractMappedValues([f1, f2], answers);
    expect(result.location).toBe("Lisbon");
    expect(result.venue_name).toBe("Palacio da Regaleira");
  });

  it("ignores freeform fields (field_mapping null)", () => {
    const fields = [makeField({ field_mapping: null })];
    const answers = { [FIELD_ID]: "Some answer" };
    const result = extractMappedValues(fields, answers);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("omits fields with no answer", () => {
    const fields = [makeField({ field_mapping: "event_date" })];
    const result = extractMappedValues(fields, {});
    expect(result.event_date).toBeUndefined();
  });

  it("omits fields with empty string answer", () => {
    const fields = [makeField({ field_mapping: "venue_name" })];
    const result = extractMappedValues(fields, { [FIELD_ID]: "" });
    expect(result.venue_name).toBeUndefined();
  });
});

describe("buildAnswerPayloads", () => {
  it("returns empty array when all fields are mapped", () => {
    const fields = [makeField({ field_mapping: "location" })];
    const answers = { [FIELD_ID]: "Porto" };
    expect(buildAnswerPayloads(fields, answers)).toHaveLength(0);
  });

  it("returns a payload for a freeform field with an answer", () => {
    const fields = [makeField({ field_mapping: null, label: "How did you meet?", sort_order: 0 })];
    const answers = { [FIELD_ID]: "At a coffee shop" };
    const result = buildAnswerPayloads(fields, answers);
    expect(result).toHaveLength(1);
    expect(result[0].question_text).toBe("How did you meet?");
    expect(result[0].answer_value).toBe("At a coffee shop");
    expect(result[0].sort_order).toBe(0);
  });

  it("skips freeform fields with empty answer", () => {
    const fields = [makeField({ field_mapping: null, label: "How did you meet?" })];
    const answers = { [FIELD_ID]: "" };
    expect(buildAnswerPayloads(fields, answers)).toHaveLength(0);
  });

  it("skips freeform fields with no answer entry", () => {
    const fields = [makeField({ field_mapping: null, label: "How did you meet?" })];
    expect(buildAnswerPayloads(fields, {})).toHaveLength(0);
  });

  it("preserves sort_order from field definition", () => {
    const fields = [makeField({ field_mapping: null, sort_order: 5 })];
    const answers = { [FIELD_ID]: "Answer" };
    expect(buildAnswerPayloads(fields, answers)[0].sort_order).toBe(5);
  });

  it("returns one payload per answered freeform field", () => {
    const f1 = makeField({ id: "f1", field_mapping: null, label: "Q1", sort_order: 0 });
    const f2 = makeField({ id: "f2", field_mapping: "location", sort_order: 1 });
    const f3 = makeField({ id: "f3", field_mapping: null, label: "Q3", sort_order: 2 });
    const answers = { f1: "A1", f2: "Porto", f3: "A3" };
    const result = buildAnswerPayloads([f1, f2, f3], answers);
    expect(result).toHaveLength(2);
    expect(result[0].question_text).toBe("Q1");
    expect(result[1].question_text).toBe("Q3");
  });
});

describe("normalizeFormUrl", () => {
  it("lowercases the input", () => {
    expect(normalizeFormUrl("Portugal")).toBe("portugal");
  });

  it("trims whitespace", () => {
    expect(normalizeFormUrl("  elopements  ")).toBe("elopements");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeFormUrl("destination weddings")).toBe("destination-weddings");
  });

  it("removes characters that are not alphanumeric or hyphens", () => {
    expect(normalizeFormUrl("porto!@#weddings")).toBe("portoweddings");
  });

  it("collapses multiple hyphens", () => {
    expect(normalizeFormUrl("a--b--c")).toBe("a-b-c");
  });

  it("strips leading and trailing hyphens", () => {
    expect(normalizeFormUrl("-portugal-")).toBe("portugal");
  });
});
