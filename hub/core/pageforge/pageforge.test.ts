import { describe, expect, it } from "vitest";
import { applyGiantInsights, renderPage, validatePage } from "./src/index";

const validSchema = {
  id: "beauty-landing",
  title: "BeautyOps",
  theme: { colors: { primary: "#0f172a", accent: "#22c55e" }, font: "system-ui", radius: "1rem", spacing: "1rem" },
  sections: [
    {
      id: "hero",
      constructs: [
        { id: "hero-1", type: "hero", props: { headline: "Agenda lotada?", ctaLabel: "Quero minha bios", ctaHref: "#" } },
      ],
    },
  ],
};

describe("pageforge: validation", () => {
  it("accepts valid schema", () => {
    const result = validatePage(validSchema as any);
    expect(result.valid).toBe(true);
  });

  it("rejects missing required field", () => {
    const broken = JSON.parse(JSON.stringify(validSchema));
    broken.sections[0].constructs[0].props.headline = "";
    const result = validatePage(broken as any);
    expect(result.valid).toBe(false);
  });
});

describe("pageforge: render", () => {
  it("renders headline", () => {
    const html = renderPage(validSchema as any);
    expect(html).toContain("Agenda lotada?");
    expect(html).toContain("<!doctype html>");
  });

  it("includes skip link and main landmark", () => {
    const html = renderPage(validSchema as any);
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('role="main"');
  });
});

describe("pageforge: accessibility", () => {
  it("renders interactive roles", () => {
    const schema = {
      id: "a11y",
      title: "A11y",
      theme: { colors: { primary: "#0f172a", accent: "#22c55e" }, font: "system-ui", radius: "1rem", spacing: "1rem" },
      sections: [
        {
          id: "tabs",
          constructs: [{ id: "tabs-1", type: "tabs", props: { label: "Tabs", items: [{ label: "A", content: "A" }] } }],
        },
        {
          id: "modal",
          constructs: [{ id: "modal-1", type: "modal", props: { trigger: "Open", content: "Content", label: "Dialog" } }],
        },
      ],
    };
    const html = renderPage(schema as any);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });
});

describe("pageforge: perf budget", () => {
  it("throws when budget exceeded", () => {
    const schema = JSON.parse(JSON.stringify(validSchema));
    schema.perfBudget = { maxHtmlKb: 0.001 };
    expect(() => renderPage(schema)).toThrow(/Performance budget exceeded/);
  });
});


describe("pageforge: giant insights", () => {
  it("applies insights to schema", () => {
    const schema = applyGiantInsights(validSchema as any, ["lead routing", "local SEO"]);
    const html = renderPage(schema as any);
    expect(html).toContain("Reusable giant patterns");
    expect(html).toContain("lead routing");
  });
});

describe("pageforge: visual runtime", () => {
  it("renders adapter fallback and cdn scripts", () => {
    const schema = {
      id: "visual-pilot",
      title: "Visual Pilot",
      theme: { colors: { primary: "#0f172a", accent: "#22c55e" }, font: "system-ui", radius: "1rem", spacing: "1rem" },
      sections: [
        {
          id: "hero",
          constructs: [{ id: "hero-1", type: "hero", props: { headline: "Visual Pilot" }, visual: { adapter: "gsap", props: { label: "Hero motion" } } }],
        },
      ],
      accessibility: { skipLink: true, landmarkRoles: true },
      perfBudget: { maxHtmlKb: 100 },
    };
    const html = renderPage(schema as any);
    expect(html).toContain('data-visual-adapter="gsap"');
    expect(html).toContain("cdn.jsdelivr.net/npm/gsap");
    expect(html).toContain("<script>");
  });
});
