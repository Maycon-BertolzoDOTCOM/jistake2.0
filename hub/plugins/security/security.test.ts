import { describe, expect, it } from "vitest";
import { SecurityGlossary } from "./src/glossary";
import { SecurityTimeline } from "./src/timeline";

describe("security: glossary", () => {
  it("searches by term", () => {
    const g = new SecurityGlossary();
    const res = g.search("janus");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((r) => r.term === "Janus")).toBe(true);
  });
  it("returns all terms", () => {
    const g = new SecurityGlossary();
    expect(g.getTerms().length).toBeGreaterThan(10);
  });
});

describe("security: timeline validation", () => {
  it("flags unauthorized category", () => {
    const t = new SecurityTimeline();
    const entity = {
      id: "g1",
      label: "gpt",
      type: "gpt",
      metadata: { categorias: ["cat1_direta"], link: "link" },
    } as any;
    const block = [
      {
        id: "block-g1-cat8_output_embedding",
        entityId: "g1",
        order: 0,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        metadata: { category: "cat8_output_embedding", categoryLabel: "cat8" },
      },
    ] as any;
    const r = t.validate(block, [entity]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.blockId.includes("cat8"))).toBe(true);
  });
});
