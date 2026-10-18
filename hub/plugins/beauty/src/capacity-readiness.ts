import {
  assessReadiness,
  computeCapacityMetrics,
  matchRequest,
  networkDensity,
  type Handoff,
  type ReadinessThresholds,
} from "@hub/capacity-engine";
import {
  adaptCapacities,
  adaptRequests,
  beautyCapacityCriteria,
  beautyCriteria,
  BEAUTY_DEFAULT_RADIUS_KM,
  BEAUTY_SCOPE,
  type AdaptationReport,
  type CapacityGap,
  type BeautyOperationalDocument,
} from "./capacity";

const DEFAULT_THRESHOLDS: ReadinessThresholds = {
  minCompatibleProviders: 3,
  minConfirmedProviders: 3,
  minRecordedRequests: 10,
  minCompletedHandoffs: 1,
};

export interface BeautyCapacityReadiness {
  scope: string;
  network: ReturnType<typeof networkDensity>;
  capacityGaps: CapacityGap[];
  requestGaps: CapacityGap[];
  operationalReady: boolean;
  metrics: ReturnType<typeof computeCapacityMetrics>;
  readiness: ReturnType<typeof assessReadiness>;
  blockers: string[];
}

export interface ReadinessInput {
  document: BeautyOperationalDocument;
  handoffs?: Handoff[];
  completedHandoffs?: number;
  thresholds?: ReadinessThresholds;
  center?: { lat: number; lng: number };
}

function unique(gaps: CapacityGap[]): CapacityGap[] {
  const seen = new Map<string, CapacityGap>();
  for (const entry of gaps) {
    const key = `${entry.field}|${entry.reason}`;
    if (!seen.has(key)) seen.set(key, entry);
  }
  return [...seen.values()];
}

export function assessBeautyCapacity(input: ReadinessInput): BeautyCapacityReadiness {
  const capacities: AdaptationReport<ReturnType<typeof adaptCapacities>["data"]> =
    adaptCapacities(input.document);
  const requests: AdaptationReport<ReturnType<typeof adaptRequests>["data"]> = adaptRequests(
    input.document,
  );

  const center =
    input.center ??
    input.document.salon?.location ?? { lat: 0, lng: 0 };

  const serviceId = requests.data[0]?.serviceId ?? "";
  const network = networkDensity(
    capacities.data,
    serviceId,
    input.document.salon?.radiusKm ?? BEAUTY_DEFAULT_RADIUS_KM,
    center,
    BEAUTY_SCOPE,
  );

  const handoffs = input.handoffs ?? [];
  const matchableCount = requests.data.reduce((total, request) => {
    const result = matchRequest(request, capacities.data, beautyCriteria());
    return total + result.matchableCount;
  }, 0);

  const blockedReasons = capacities.gaps
    .concat(requests.gaps)
    .filter((entry) => entry.blocking)
    .map((entry) => entry.reason);

  const metrics = computeCapacityMetrics({
    requestsReceived: requests.data.length,
    requestsUnfulfilled: requests.data.length,
    handoffs,
    matchableCount,
    blockedReasons,
  });

  const completedHandoffs = input.completedHandoffs ?? metrics.handoffsCompleted;
  const readiness = assessReadiness(
    network,
    requests.data.length,
    completedHandoffs,
    input.thresholds ?? DEFAULT_THRESHOLDS,
  );

  const capacityGaps = unique(capacities.gaps);
  const requestGaps = unique(requests.gaps);
  const blockers = unique([...capacityGaps, ...requestGaps])
    .filter((entry) => entry.blocking)
    .map((entry) => `${entry.field}: ${entry.reason}`);

  return {
    scope: BEAUTY_SCOPE,
    network,
    capacityGaps,
    requestGaps,
    operationalReady: capacities.ready && requests.ready,
    metrics,
    readiness,
    blockers,
  };
}

export function describeBeautyCapacity(): string {
  return beautyCapacityCriteria.describe();
}
