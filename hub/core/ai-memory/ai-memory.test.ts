import { describe, expect, it } from "vitest";
import { createMemory } from "./src/index";

describe("ai-memory: versioned page", () => {
  it("increments version on update", () => {
    const m = createMemory();
    const e1 = m.putPage({ page: "p1", title: "t1", content: "c1", tags: ["t"], author: { id: "a1", kind: "human" } });
    const e2 = m.putPage({ page: "p1", title: "t1b", content: "c1b", tags: ["t"], author: { id: "a2", kind: "agent" } });
    expect(e1.version).toBe(1);
    expect(e2.version).toBe(2);
    expect(m.getPage("p1")?.content).toBe("c1b");
  });
});

describe("ai-memory: inbox", () => {
  it("prioritizes messages and ack", () => {
    const m = createMemory();
    m.inboxPost({ from: { id: "agent1", kind: "agent" }, to: "team", type: "task", subject: "x", body: "b", priority: "high" });
    const high = m.inboxPost({ from: { id: "agent1", kind: "agent" }, to: "team", type: "task", subject: "x", body: "b", priority: "low" });
    const list = m.inboxPull("team");
    expect(list[0].priority).toBe("high");
    m.inboxAck(high.id, "agent2");
    expect(m.inboxPull("team", false).length).toBeGreaterThan(0);
  });
});

describe("ai-memory: handoff", () => {
  it("claim once and complete", () => {
    const m = createMemory();
    const baton = m.createHandoff({ title: "t", owner: { id: "u1", kind: "human" }, payload: {}, steps: ["x"] });
    const ok = m.claimHandoff(baton.id, { id: "a2", kind: "agent" });
    const p = m.claimHandoff(baton.id, { id: "a3", kind: "agent" });
    expect(ok.success).toBe(true);
    expect(p.success).toBe(false);
    expect(m.completeHandoff(baton.id, { id: "a2", kind: "agent" }).success).toBe(true);
    const remembered = m.putPage({ page: "x", title: "y", content: "z", tags: [], author: { id: "a2", kind: "agent" } });
    expect(remembered.version).toBe(1);
  });
});
