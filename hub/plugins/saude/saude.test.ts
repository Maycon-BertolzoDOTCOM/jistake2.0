import { describe, expect, it } from "vitest";
import { SaudeTimeline } from "./src/timeline";

describe("saude: reorder", () => {
  it("reorders and indices", () => {
    const t = new SaudeTimeline();
    const blocks = [
      { id: "a", order: 0 } as any,
      { id: "b", order: 1 } as any,
    ];
    const r = t.reorder(blocks, 1, 0);
    expect(r.map((b: any) => b.id)).toEqual(["b", "a"]);
  });
});

describe("saude: toXml", () => {
  it("generates Atendimento root", () => {
    const t = new SaudeTimeline();
    const blocks = [
      {
        id: "b1",
        entityId: "e1",
        order: 0,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        metadata: { entityType: "hl7-message", messageType: "ADT_A01", stage: "admissao" },
      },
    ] as any;
    const xml = t.toXml(blocks, []);
    expect(xml).toContain("<Atendimento>");
    expect(xml).toContain("MensagemHL7");
  });
});
