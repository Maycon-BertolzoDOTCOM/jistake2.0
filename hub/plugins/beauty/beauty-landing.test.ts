import { describe, expect, it } from "vitest";
import { renderBeautyLanding, generateBeautyCopy, beautyLandingSchema } from "./src/landing";

describe("beauty landing", () => {
  it("renders valid html", () => {
    const html = renderBeautyLanding();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Agenda lotada?");
    expect(html).toContain('data-construct="quiz"');
  });

  it("generates copy", () => {
    const copy = generateBeautyCopy();
    expect(copy).toContain("# BeautyOps");
  });

  it("has valid schema", () => {
    expect(beautyLandingSchema.id).toBe("beauty-landing");
    expect(beautyLandingSchema.sections.length).toBeGreaterThan(0);
  });
});
