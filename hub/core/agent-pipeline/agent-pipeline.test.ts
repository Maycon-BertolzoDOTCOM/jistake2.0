import { describe, expect, it } from "vitest";
import { createStageHandler, runLeaves, runPipeline } from "./src/index";

describe("agent-pipeline: stages", () => {
  it("runs sequential stages", async () => {
    const handlers = {
      extract: createStageHandler("extract", async (ctx) => ({ stage: "extract", status: "completed", artifacts: { source: ctx.input.source } })),
      plan: createStageHandler("plan", async () => ({ stage: "plan", status: "completed" })),
    };
    const result = await runPipeline({ id: "p1", source: "src", task: "t" }, handlers, { stages: ["extract", "plan"] });
    expect(result.status).toBe("completed");
    expect(result.stages.extract?.status).toBe("completed");
  });

  it("blocks when approval denied", async () => {
    const handlers = { extract: createStageHandler("extract", async () => ({ stage: "extract", status: "completed" })) };
    const result = await runPipeline({ id: "p2", source: "src", task: "t" }, handlers, { stages: ["extract"], approvals: { extract: false } });
    expect(result.status).toBe("blocked");
  });

  it("fails when handler missing", async () => {
    const result = await runPipeline({ id: "p3", source: "src", task: "t" }, {}, { stages: ["extract"] });
    expect(result.status).toBe("failed");
  });
});

describe("agent-pipeline: leaves", () => {
  it("runs with concurrency", async () => {
    const results = await runLeaves([async () => 1, async () => 2, async () => 3], 2);
    expect(results).toEqual([1, 2, 3]);
  });
});
