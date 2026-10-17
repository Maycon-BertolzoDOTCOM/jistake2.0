import { describe, expect, it } from "vitest";
import { canCouple, compareGiants, loadRegistry, rankGiants, validateGiant } from "./src/index";

describe("giants: validation", () => {
  it("accepts complete entry", () => {
    const result = validateGiant({
      id: "deskcomm",
      name: "DeskcommCRM",
      url: "https://github.com/melgarafael/DeskcommCRM",
      category: "crm",
      license: "MIT",
      strengths: ["WhatsApp", "multi-tenant", "LGPD"],
      weaknesses: ["heavy stack"],
      reusablePatterns: ["lead routing", "automations"],
      integrationDecision: "adapt",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = validateGiant({ id: "", name: "", url: "", category: "crm", license: "", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "monitor" } as any);
    expect(result.valid).toBe(false);
  });
});

describe("giants: coupling", () => {
  it("allows permissive adopt/adapt", () => {
    expect(canCouple({ id: "r", name: "Reactor", url: "x", category: "plugin-runtime", license: "BSD-3-Clause", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "adopt" })).toBe(true);
    expect(canCouple({ id: "m", name: "Mira", url: "x", category: "animation", license: "PolyForm Noncommercial 1.0.0", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "adapt" })).toBe(false);
  });
});

describe("giants: ranking", () => {
  it("sorts by decision priority", () => {
    const entries = [
      { id: "a", name: "A", url: "x", category: "crm", license: "MIT", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "monitor" },
      { id: "b", name: "B", url: "x", category: "crm", license: "MIT", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "adopt" },
    ] as any;
    expect(rankGiants(entries).map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("giants: registry", () => {
  it("loads valid registry", () => {
    const registry = loadRegistry({ giants: [{ id: "x", name: "X", url: "u", category: "seo", license: "MIT", strengths: [], weaknesses: [], reusablePatterns: [], integrationDecision: "monitor" }] });
    expect(registry.giants.length).toBe(1);
  });

  it("compares giants", () => {
    const result = compareGiants([{ id: "x", name: "X", url: "u", category: "seo", license: "MIT", strengths: ["s"], weaknesses: ["w"], reusablePatterns: [], integrationDecision: "monitor" }]);
    expect(result[0].topStrength).toBe("s");
    expect(result[0].topWeakness).toBe("w");
  });
});
