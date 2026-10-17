import type { MemoryStore } from "@hub/ai-memory";

export type PipelineStage = "extract" | "plan" | "copy" | "build" | "animate" | "validate";

export type StageStatus = "pending" | "running" | "completed" | "failed" | "blocked" | "skipped";

export interface PipelineInput {
  id: string;
  source: string;
  task: string;
  vertical?: string;
}

export interface PipelineContext {
  input: PipelineInput;
  memory?: MemoryStore;
  artifacts: Record<string, unknown>;
  logs: string[];
  approvals: Partial<Record<PipelineStage, boolean>>;
}

export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  output?: unknown;
  artifacts?: Record<string, unknown>;
  error?: string;
  nextStage?: PipelineStage;
}

export interface StageHandler {
  stage: PipelineStage;
  run(context: PipelineContext): Promise<StageResult>;
}

export interface PipelineResult {
  id: string;
  status: StageStatus;
  stages: Partial<Record<PipelineStage, StageResult>>;
  artifacts: Record<string, unknown>;
  logs: string[];
}

export interface PipelineOptions {
  stages?: PipelineStage[];
  approvals?: Partial<Record<PipelineStage, boolean>>;
  concurrency?: number;
}

const DEFAULT_STAGES: PipelineStage[] = ["extract", "plan", "copy", "build", "animate", "validate"];

export async function runPipeline(
  input: PipelineInput,
  handlers: Partial<Record<PipelineStage, StageHandler>>,
  options: PipelineOptions = {},
  memory?: MemoryStore,
): Promise<PipelineResult> {
  const stages = options.stages || DEFAULT_STAGES;
  const context: PipelineContext = {
    input,
    memory,
    artifacts: {},
    logs: [],
    approvals: options.approvals || {},
  };

  const result: PipelineResult = {
    id: input.id,
    status: "pending",
    stages: {},
    artifacts: context.artifacts,
    logs: context.logs,
  };

  for (const stage of stages) {
    if (context.approvals[stage] === false) {
      const blocked: StageResult = { stage, status: "blocked", error: "approval denied" };
      result.stages[stage] = blocked;
      result.status = "blocked";
      context.logs.push(`${stage}: blocked`);
      return result;
    }

    const handler = handlers[stage];
    if (!handler) {
      const failed: StageResult = { stage, status: "failed", error: `missing handler for ${stage}` };
      result.stages[stage] = failed;
      result.status = "failed";
      context.logs.push(`${stage}: missing handler`);
      return result;
    }

    context.logs.push(`${stage}: running`);
    const stageResult = await handler.run(context);
    const normalized: StageResult = { ...stageResult, stage };
    result.stages[stage] = normalized;

    if (normalized.artifacts) {
      Object.assign(context.artifacts, normalized.artifacts);
    }

    if (normalized.status === "failed") {
      result.status = "failed";
      context.logs.push(`${stage}: failed`);
      return result;
    }

    if (normalized.status === "blocked") {
      result.status = "blocked";
      context.logs.push(`${stage}: blocked`);
      return result;
    }

    context.logs.push(`${stage}: completed`);
  }

  result.status = "completed";
  return result;
}

export async function runLeaves<T>(tasks: Array<() => Promise<T>>, concurrency = 3): Promise<T[]> {
  if (tasks.length === 0) return [];
  const limit = Math.max(1, concurrency);
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function createStageHandler(stage: PipelineStage, run: (context: PipelineContext) => Promise<StageResult>): StageHandler {
  return { stage, run };
}
