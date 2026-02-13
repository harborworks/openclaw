import { describe, it, expect } from "vitest";
import { ALL_MODELS, modelToDisplay, modelRequiredKey } from "./models";

describe("ALL_MODELS", () => {
  it("has unique values", () => {
    const values = ALL_MODELS.map((m) => m.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("has unique labels", () => {
    const labels = ALL_MODELS.map((m) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every model has a requiredKey", () => {
    for (const m of ALL_MODELS) {
      expect(m.requiredKey).toBeTruthy();
    }
  });
});

describe("modelToDisplay", () => {
  it("returns label for known model", () => {
    expect(modelToDisplay("opus4.6")).toBe("Opus 4.6");
    expect(modelToDisplay("sonnet4.5")).toBe("Sonnet 4.5");
    expect(modelToDisplay("haiku4.5")).toBe("Haiku 4.5");
  });

  it("returns value as-is for unknown model", () => {
    expect(modelToDisplay("unknown-model")).toBe("unknown-model");
  });
});

describe("modelRequiredKey", () => {
  it("returns key for known model", () => {
    expect(modelRequiredKey("opus4.6")).toBe("ANTHROPIC_API_KEY");
    expect(modelRequiredKey("sonnet4.5")).toBe("ANTHROPIC_API_KEY");
    expect(modelRequiredKey("haiku4.5")).toBe("ANTHROPIC_API_KEY");
  });

  it("returns undefined for unknown model", () => {
    expect(modelRequiredKey("unknown")).toBeUndefined();
  });
});
