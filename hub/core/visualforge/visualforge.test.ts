import { describe, expect, it } from "vitest";
import { VISUAL_INIT_SCRIPT, listAdapters, renderVisual, resolveAdapter } from "./src/index";

describe("visualforge: adapters", () => {
  it("lists all adapters", () => {
    expect(listAdapters()).toEqual(["gsap", "three", "rive", "splat", "motion"]);
  });

  it("renders fallback html", () => {
    const result = renderVisual("gsap", { label: "Hero motion" });
    expect(result.fallbackHtml).toContain("visual-gsap");
    expect(result.html).toContain("Hero motion");
  });

  it("resolves adapter", () => {
    const adapter = resolveAdapter("three");
    expect(adapter?.name).toBe("three");
    expect(adapter?.perfBudgetKb).toBeGreaterThan(0);
  });
});

describe("visualforge: runtime", () => {
  it("includes init hooks for all adapters", () => {
    expect(VISUAL_INIT_SCRIPT).toContain("window.gsap");
    expect(VISUAL_INIT_SCRIPT).toContain("window.THREE");
    expect(VISUAL_INIT_SCRIPT).toContain("window.rive");
    expect(VISUAL_INIT_SCRIPT).toContain("window.GaussianSplats3D");
  });
});
