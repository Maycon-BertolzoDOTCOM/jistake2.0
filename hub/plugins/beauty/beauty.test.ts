import { describe, expect, it } from "vitest";
import { BeautyTimeline } from "./src/timeline";
import { BeautyGlossary } from "./src/glossary";

describe("beauty: reorder", () => {
  it("reorders indices", () => {
    const t = new BeautyTimeline();
    const blocks = [
      { id: "a", order: 0 } as any,
      { id: "b", order: 1 } as any,
    ];
    const r = t.reorder(blocks, 1, 0);
    expect(r.map((b: any) => b.id)).toEqual(["b", "a"]);
  });
});

describe("beauty: toXml", () => {
  it("generates BeautyPipeline root", () => {
    const t = new BeautyTimeline();
    const blocks = [
      {
        id: "b1",
        entityId: "e1",
        order: 0,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        metadata: { entityType: "appointment", status: "confirmed", stage: "confirmacao", clientId: "c1", serviceId: "s1" },
      },
    ] as any;
    const xml = t.toXml(blocks, []);
    expect(xml).toContain("<BeautyPipeline>");
    expect(xml).toContain("Appointment");
  });
});

describe("beauty: glossary", () => {
  it("searches by term", () => {
    const g = new BeautyGlossary();
    const res = g.search("overflow");
    expect(res.length).toBeGreaterThan(0);
  });
});
