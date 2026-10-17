import { describe, expect, it } from "vitest";
import { createTimelineBlock, orderBlocks, reorderBlocks } from "./src/index";

describe("timeline-engine: createTimelineBlock", () => {
  it("assigns order by index", () => {
    const e = { id: "e1", label: "Entity", metadata: {}, type: "node" } as any;
    const b = createTimelineBlock(e, 3);
    expect(b.entityId).toBe("e1");
    expect(b.order).toBe(3);
    expect(b.x).toBe(660);
  });
});

describe("timeline-engine: orderBlocks", () => {
  it("sorts ascending by order", () => {
    const blocks = [
      { id: "b2", order: 2 } as any,
      { id: "b0", order: 0 } as any,
    ];
    expect(orderBlocks(blocks).map((b: any) => b.id)).toEqual(["b0", "b2"]);
  });
});

describe("timeline-engine: reorderBlocks", () => {
  it("moves and reorders indices", () => {
    const blocks = [
      { id: "b0", order: 0 } as any,
      { id: "b1", order: 1 } as any,
      { id: "b2", order: 2 } as any,
    ];
    const result = reorderBlocks(blocks, 2, 0);
    expect(result.map((b: any) => b.id)).toEqual(["b2", "b0", "b1"]);
    expect(result.map((b: any) => b.order)).toEqual([0, 1, 2]);
  });
});
