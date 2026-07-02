import { describe, expect, it } from "vitest";

import { DEFAULT_CONTENT } from "@/lib/cms/defaults";
import { deepMerge, getResidenceBySlug, mergeContent, slugify, tx } from "@/lib/cms/select";

describe("deepMerge", () => {
  it("recurses objects, replaces primitives/arrays, keeps base on undefined", () => {
    const base = { a: 1, b: { c: 2, d: 3 }, list: [1, 2] };
    const out = deepMerge(base, { b: { c: 99 }, list: [9], a: undefined });
    expect(out).toEqual({ a: 1, b: { c: 99, d: 3 }, list: [9] });
  });

  it("returns base when override is null/undefined", () => {
    expect(deepMerge({ x: 1 }, undefined)).toEqual({ x: 1 });
    expect(deepMerge({ x: 1 }, null)).toEqual({ x: 1 });
  });
});

describe("mergeContent", () => {
  it("fills a partial/empty store with defaults (render-safe)", () => {
    const merged = mergeContent({});
    expect(merged.residences.length).toBeGreaterThan(0);
    expect(merged.header.brand).toBe(DEFAULT_CONTENT.header.brand);
  });

  it("guarantees a valid primary residence selection", () => {
    const merged = mergeContent({ primaryResidenceId: "does-not-exist" });
    expect(merged.residences.some((r) => r.id === merged.primaryResidenceId)).toBe(true);
  });

  it("falls back to default residences when the stored list is empty", () => {
    const merged = mergeContent({ residences: [] });
    expect(merged.residences.length).toBe(DEFAULT_CONTENT.residences.length);
  });

  it("preserves an admin's edited field", () => {
    const merged = mergeContent({ header: { brand: "EDITED" } });
    expect(merged.header.brand).toBe("EDITED");
    // ...without dropping sibling defaults
    expect(merged.header.email).toBe(DEFAULT_CONTENT.header.email);
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs and strips diacritics", () => {
    expect(slugify("Résidence Yasmine!")).toBe("residence-yasmine");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });
  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("residence");
  });
});

describe("getResidenceBySlug / tx", () => {
  it("finds a residence by slug or id", () => {
    const c = mergeContent({});
    const first = c.residences[0];
    expect(getResidenceBySlug(c, first.slug)?.id).toBe(first.id);
    expect(getResidenceBySlug(c, first.id)?.id).toBe(first.id);
    expect(getResidenceBySlug(c, "nope")).toBeUndefined();
  });
  it("picks the requested language with FR fallback when the key is absent", () => {
    expect(tx({ fr: "Bonjour", ar: "مرحبا" }, "ar")).toBe("مرحبا");
    // A missing AR key (legacy/partial data) falls back to FR.
    expect(tx({ fr: "Bonjour" } as unknown as { fr: string; ar: string }, "ar")).toBe("Bonjour");
    expect(tx(undefined, "fr")).toBe("");
  });
});
