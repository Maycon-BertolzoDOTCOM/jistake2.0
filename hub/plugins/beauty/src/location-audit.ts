import {
  canMatchOnLocation,
  matchGeographically,
  matchRegionally,
  type GeographicMatch,
  type LocationMatch,
  type RegionalMatch,
} from "./location-matching";
import { sameNeighborhood, type ProviderLocation } from "./location";

export type LocationAuditReason =
  | "geographic-verified"
  | "regional-approximate"
  | "blocked-no-location"
  | "blocked-invalid-coordinates"
  | "blocked-out-of-range"
  | "inconclusive-mixed-precision";

export interface LocationAuditEntry {
  requestId: string;
  providerId: string;
  outcome: "matched" | "blocked" | "inconclusive";
  evidence: "geographic" | "regional" | "none";
  distanceKm?: number;
  neighborhood?: string;
  reason: LocationAuditReason;
  detail: string;
}

export interface LocationPrecisionSummary {
  requestsWithCoordinates: number;
  requestsRegionalOnly: number;
  requestsWithoutLocation: number;
  providersWithCoordinates: number;
  providersRegionalOnly: number;
  providersWithoutLocation: number;
  geographicMatches: number;
  regionalMatches: number;
  blockedForLocation: number;
  inconclusive: number;
}

export interface LocationAuditInput {
  requests: Array<{ id: string; location: ProviderLocation; radiusKm: number }>;
  providers: Array<{
    id: string;
    location: ProviderLocation;
    reachKm: number;
    invalidCoordinates?: boolean;
  }>;
}

function summarize(input: LocationAuditInput, entries: LocationAuditEntry[]): LocationPrecisionSummary {
  return {
    requestsWithCoordinates: input.requests.filter((r) => r.location.mode === "coordinates").length,
    requestsRegionalOnly: input.requests.filter((r) => r.location.mode === "neighborhood").length,
    requestsWithoutLocation: input.requests.filter((r) => r.location.mode === "unknown").length,
    providersWithCoordinates: input.providers.filter((p) => p.location.mode === "coordinates").length,
    providersRegionalOnly: input.providers.filter((p) => p.location.mode === "neighborhood").length,
    providersWithoutLocation: input.providers.filter((p) => p.location.mode === "unknown").length,
    geographicMatches: entries.filter((e) => e.evidence === "geographic").length,
    regionalMatches: entries.filter((e) => e.evidence === "regional").length,
    blockedForLocation: entries.filter((e) => e.outcome === "blocked").length,
    inconclusive: entries.filter((e) => e.outcome === "inconclusive").length,
  };
}

/**
 * Avalia cada par sol solicitacao/parceira e registra POR QUE foi aceito,
 * bloqueado ou considerado inconclusivo.
 *
 * Regra central: correspondecia regional NUNCA entra em `geographicMatches`.
 * Uma e distancia calculada; a outra e regiao declarada.
 */
export function auditLocationMatching(input: LocationAuditInput): {
  entries: LocationAuditEntry[];
  summary: LocationPrecisionSummary;
} {
  const entries: LocationAuditEntry[] = [];

  for (const request of input.requests) {
    for (const provider of input.providers) {
      entries.push(
        evaluatePair(request, provider),
      );
    }
  }

  return { entries, summary: summarize(input, entries) };
}

function evaluatePair(
  request: { id: string; location: ProviderLocation; radiusKm: number },
  provider: { id: string; location: ProviderLocation; reachKm: number; invalidCoordinates?: boolean },
): LocationAuditEntry {
  const base = { requestId: request.id, providerId: provider.id };

  if (provider.invalidCoordinates) {
    return {
      ...base,
      outcome: "blocked",
      evidence: "none",
      reason: "blocked-invalid-coordinates",
      detail: "Coordenada da parceira presente e invalida. Nada foi calculado.",
    };
  }

  if (!canMatchOnLocation(request.location) || !canMatchOnLocation(provider.location)) {
    return {
      ...base,
      outcome: "blocked",
      evidence: "none",
      reason: "blocked-no-location",
      detail:
        request.location.mode === "unknown"
          ? "Solicitacao sem localizacao suficiente. Correspondencia bloqueada."
          : "Parceira sem localizacao suficiente. Correspondencia bloqueada.",
    };
  }

  const geographic = matchGeographically(
    request.location,
    provider.location,
    request.radiusKm,
    provider.reachKm,
  );

  if (geographic) {
    const ok = geographic.withinRequestRadius && geographic.withinProviderReach;
    return {
      ...base,
      outcome: ok ? "matched" : "blocked",
      evidence: "geographic",
      distanceKm: geographic.distanceKm,
      reason: ok ? "geographic-verified" : "blocked-out-of-range",
      detail: geographic.reason,
    };
  }

  const regional = matchRegionally(request.location, provider.location);

  if (regional) {
    return {
      ...base,
      outcome: "matched",
      evidence: "regional",
      neighborhood: regional.neighborhood,
      reason: "regional-approximate",
      detail: regional.reason,
    };
  }

  const bothNeighborhood = request.location.mode === "neighborhood" && provider.location.mode === "neighborhood";

  if (bothNeighborhood) {
    return {
      ...base,
      outcome: "blocked",
      evidence: "none",
      reason: "blocked-out-of-range",
      detail: "Regioes declaradas diferentes. Sem distancia calculada.",
    };
  }

  return {
    ...base,
    outcome: "inconclusive",
    evidence: "none",
    reason: "inconclusive-mixed-precision",
    detail:
      "Precisao incompativel: uma parte tem coordenada e a outra so regiao. Nao ha dado para concluir.",
  };
}

/** Exposto para auditoria externa confirmar regra explicita de bairro. */
export function regionsAgree(
  left: ProviderLocation,
  right: ProviderLocation,
): boolean {
  return left.mode === "neighborhood" && right.mode === "neighborhood"
    ? sameNeighborhood(left, right)
    : false;
}

export type { LocationMatch, GeographicMatch, RegionalMatch };
