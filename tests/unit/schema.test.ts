import { describe, expect, it } from "vitest";

import { DEFAULT_CONTENT } from "@/lib/cms/defaults";
import { contentSchema, sectionSchemas, validateSection } from "@/lib/cms/schema";
import type { SectionKey } from "@/lib/cms/types";

describe("content schema", () => {
  it("accepts the default content (guards against false rejections)", () => {
    expect(() => contentSchema.parse(DEFAULT_CONTENT)).not.toThrow();
  });

  it("validates every top-level section of the default content", () => {
    for (const key of Object.keys(sectionSchemas) as SectionKey[]) {
      const value = DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT];
      expect(() => validateSection(key, value)).not.toThrow();
    }
  });

  it("rejects malformed section payloads", () => {
    expect(() => validateSection("residences", "not-an-array")).toThrow();
    expect(() => validateSection("header", { brand: 123 })).toThrow();
  });
});
