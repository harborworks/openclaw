import { describe, it, expect } from "vitest";
import { toSlug } from "./slug";

describe("toSlug", () => {
  it("converts a name to lowercase kebab-case", () => {
    expect(toSlug("Sparrow Computing")).toBe("sparrow-computing");
  });

  it("handles multiple spaces and special characters", () => {
    expect(toSlug("My  Cool -- App!")).toBe("my-cool-app");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("  Hello World  ")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(toSlug("")).toBe("");
  });

  it("handles already-slugified input", () => {
    expect(toSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("handles numbers", () => {
    expect(toSlug("Harbor 42")).toBe("harbor-42");
  });

  it("collapses consecutive special chars into single hyphen", () => {
    expect(toSlug("a & b @ c")).toBe("a-b-c");
  });
});
