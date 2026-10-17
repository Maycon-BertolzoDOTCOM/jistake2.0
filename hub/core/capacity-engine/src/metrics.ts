import {
  CapacityMetrics,
  FailureReason,
  Handoff,
  OpportunityEstimate,
} from "./types";

export interface MetricsInput {
  requestsReceived: number;
  requestsUnfulfilled: number;
  handoffs: Handoff[];
  matchableCount: number;
  blockedReasons?: string[];
}

export function tallyReasons(reasons: string[]): FailureReason[] {
  const counts = new Map<string, number>();
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export function computeCapacityMetrics(
  input: MetricsInput,
  estimate?: OpportunityEstimate,
): CapacityMetrics {
  const handoffs = input.handoffs;

  const byStatus = (status: Handoff["status"]) =>
    handoffs.filter((handoff) => handoff.status === status).length;

  const completedCount = byStatus("completed");

  if (completedCount > input.matchableCount) {
    throw new Error(
      `completedCount (${completedCount}) cannot exceed matchableCount (${input.matchableCount})`,
    );
  }

  return {
    requestsReceived: input.requestsReceived,
    requestsUnfulfilled: input.requestsUnfulfilled,
    matchesProposed: input.matchableCount,
    handoffsOffered: handoffs.filter((handoff) => handoff.status !== "requested").length,
    handoffsClientAccepted: handoffs.filter((handoff) => handoff.clientDecision?.decision === "accepted").length,
    handoffsProviderConfirmed: handoffs.filter((handoff) => handoff.providerDecision?.decision === "accepted").length,
    handoffsCompleted: completedCount,
    handoffsDeclined: byStatus("declined"),
    handoffsExpired: byStatus("expired"),
    handoffsCancelled: byStatus("cancelled"),
    potentialRecoverable: estimate?.potentialRecoverable ?? input.matchableCount,
    matchableCount: input.matchableCount,
    completedCount,
    failures: tallyReasons(input.blockedReasons ?? []),
  };
}
