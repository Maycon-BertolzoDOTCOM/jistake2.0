import { describe, expect, it } from "vitest";
import { createMemory } from "@hub/ai-memory";
import { contentForge } from "./src/index";

describe("contentforge: templates", () => {
  it("renders landing template", () => {
    const out = contentForge.renderTemplate("landing", {
      title: "BeautyOps",
      headline: "Agenda lotada?",
      subheadline: "Não perca cliente.",
      valueProps: ["Overflow", "Parceiros"],
      cta: "Quero minha bios",
    });
    expect(out).toContain("# BeautyOps");
    expect(out).toContain("- Overflow");
  });

  it("generates landing content", () => {
    const generated = contentForge.generateLanding({
      title: "BeautyOps",
      headline: "Agenda lotada?",
      valueProps: ["Overflow"],
      cta: "Quero",
      vertical: "beauty",
    });
    expect(generated.template).toBe("landing");
    expect(generated.tags).toContain("beauty");
  });

  it("includes giant patterns when provided", () => {
    const generated = contentForge.generateLanding({
      title: "BeautyOps",
      headline: "Agenda lotada?",
      valueProps: ["Overflow"],
      cta: "Quero",
      vertical: "beauty",
      giants: [{ id: "deskcomm", name: "DeskcommCRM", url: "x", category: "crm", license: "MIT", strengths: [], weaknesses: [], reusablePatterns: ["lead routing"], integrationDecision: "adapt" }],
    });
    expect(generated.giantPatterns).toContain("lead routing");
    expect(generated.content).toContain("Giant pattern: lead routing");
  });
});

describe("contentforge: recall", () => {
  it("does not overwrite existing page", () => {
    const store = createMemory();
    store.putPage({ page: "p1", title: "old", content: "old", tags: [], author: { id: "u", kind: "human" } });
    const result = contentForge.recallOrGenerate(store, "p1", () => ({
      template: "copy",
      title: "new",
      content: "new",
      tags: ["new"],
    }));
    expect(result.content).toBe("old");
  });
});
