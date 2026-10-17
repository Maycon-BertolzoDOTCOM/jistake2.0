import {
  CompatibilityCriterion,
  MatchCandidate,
  MatchResult,
  OpportunityEstimate,
  ProviderCapacity,
  ServiceRequest,
} from "./types";
import { haversineKm, isValidGeoPoint } from "./geo";

export function estimateOpportunity(
  excessDemand: number,
  freeCapacity: number,
): OpportunityEstimate {
  if (!Number.isFinite(excessDemand) || excessDemand < 0) {
    throw new RangeError("excessDemand must be a non-negative number");
  }
  if (!Number.isFinite(freeCapacity) || freeCapacity < 0) {
    throw new RangeError("freeCapacity must be a non-negative number");
  }
  return {
    excessDemand,
    freeCapacity,
    potentialRecoverable: Math.min(excessDemand, freeCapacity),
  };
}

export function scoreCandidate(candidate: MatchCandidate): number {
  return Math.round(Math.min(Math.max(candidate.score, 0), 1) * 1e4) / 1e4;
}

export function matchRequest(
  request: ServiceRequest,
  capacities: ProviderCapacity[],
  criteria: CompatibilityCriterion[],
): MatchResult {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Math.max(criterion.weight, 0), 0);
  const candidates: MatchCandidate[] = [];

  for (const capacity of capacities) {
    if (capacity.providerId === request.requesterId) continue;
    if (!isValidGeoPoint(capacity.location)) continue;

    const distanceKm = haversineKm(request.location, capacity.location);
    const context = { request, capacity, distanceKm };

    const reasons: string[] = [];
    const blockers: string[] = [];
    let earned = 0;

    for (const criterion of criteria) {
      const result = criterion.evaluate(context);
      const label = result.reason || criterion.label;
      if (result.passed) {
        reasons.push(label);
        earned += Math.max(criterion.weight, 0);
      } else {
        blockers.push(label);
      }
    }

    candidates.push({
      providerId: capacity.providerId,
      score: scoreCandidate({ providerId: capacity.providerId, score: totalWeight === 0 ? 0 : earned / totalWeight, reasons, blockers }),
      reasons,
      blockers,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.providerId.localeCompare(b.providerId));

  const matchableCount = candidates.filter((candidate) => candidate.blockers.length === 0).length;

  return {
    requestId: request.id,
    candidates,
    potentialRecoverable: matchableCount,
    matchableCount,
  };
}
