import {
  LocationPrecision,
  NetworkDensity,
  NetworkReadiness,
  ProviderCapacity,
  ReadinessStatus,
  ReadinessThresholds,
} from "./types";
import { tryHaversineKm } from "./geo";

export function networkDensity(
  capacities: ProviderCapacity[],
  serviceId: string,
  radiusKm: number,
  center: LocationPrecision,
  verticalScope = "generic",
): NetworkDensity {
  let compatible = 0;
  let accepting = 0;
  let confirmed = 0;
  let withCoordinates = 0;
  let regionalOnly = 0;
  let withoutLocation = 0;

  for (const capacity of capacities) {
    if (!capacity.serviceIds.includes(serviceId)) continue;

    // Densidade por bairro declarado e um sinal diferente de densidade
    // geodesica: e contado, porem nunca se disfarca de distancia calculada.
    const distanceKm = tryHaversineKm(center, capacity.location);

    if (capacity.location.mode === "unknown") {
      withoutLocation += 1;
      continue;
    }
    if (capacity.location.mode === "neighborhood") {
      regionalOnly += 1;
      compatible += 1;
      if (capacity.accepting) accepting += 1;
      if (capacity.confirmed) confirmed += 1;
      continue;
    }
    if (distanceKm === null) {
      withoutLocation += 1;
      continue;
    }
    if (distanceKm > radiusKm) continue;
    if (capacity.serviceRadiusKm < radiusKm) continue;

    compatible += 1;
    withCoordinates += 1;
    if (capacity.accepting) accepting += 1;
    if (capacity.confirmed) confirmed += 1;
  }

  return {
    verticalScope,
    radiusKm,
    serviceId,
    compatibleProviders: compatible,
    acceptingProviders: accepting,
    confirmedProviders: confirmed,
    providersWithCoordinates: withCoordinates,
    providersRegionalOnly: regionalOnly,
    providersWithoutLocation: withoutLocation,
  };
}

export const DEFAULT_THRESHOLDS: ReadinessThresholds = {
  minCompatibleProviders: 3,
  minConfirmedProviders: 3,
  minRecordedRequests: 10,
  minCompletedHandoffs: 1,
};

export function assessReadiness(
  density: NetworkDensity,
  recordedRequests: number,
  completedHandoffs: number,
  thresholds: ReadinessThresholds = DEFAULT_THRESHOLDS,
): NetworkReadiness {
  const pilotGaps: string[] = [];
  if (density.compatibleProviders < thresholds.minCompatibleProviders) {
    pilotGaps.push(`compatibleProviders ${density.compatibleProviders} < ${thresholds.minCompatibleProviders}`);
  }
  if (density.confirmedProviders < thresholds.minConfirmedProviders) {
    pilotGaps.push(`confirmedProviders ${density.confirmedProviders} < ${thresholds.minConfirmedProviders}`);
  }

  const radarGaps: string[] = [];
  if (recordedRequests < thresholds.minRecordedRequests) {
    radarGaps.push(`recordedRequests ${recordedRequests} < ${thresholds.minRecordedRequests}`);
  }
  if (completedHandoffs < thresholds.minCompletedHandoffs) {
    radarGaps.push(`completedHandoffs ${completedHandoffs} < ${thresholds.minCompletedHandoffs}`);
  }

  let status: ReadinessStatus;
  if (pilotGaps.length > 0) status = "not-ready";
  else if (radarGaps.length > 0) status = "pilot-eligible";
  else status = "radar-eligible";

  return {
    density,
    recordedRequests,
    completedHandoffs,
    status,
    unmet: [...pilotGaps, ...radarGaps],
  };
}
