import { describe, expect, it } from "vitest";
import { CinemaTimeline } from "./src/timeline";

describe("cinema: reorder", () => {
  it("reorders to indices", () => {
    const t = new CinemaTimeline();
    const blocks = [
      { id: "a", order: 0 } as any,
      { id: "b", order: 1 } as any,
    ];
    const r = t.reorder(blocks, 1, 0);
    expect(r.map((b: any) => b.id)).toEqual(["b", "a"]);
  });
});

describe("cinema: validate", () => {
  it("warns when no feature block", () => {
    const t = new CinemaTimeline();
    const blocks = [
      {
        id: "r1",
        entityId: "r1",
        order: 0,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        metadata: { entityType: "reel", reelType: "trailer" },
      },
    ] as any;
    const r = t.validate(blocks, []);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.valid).toBe(true);
  });
});
