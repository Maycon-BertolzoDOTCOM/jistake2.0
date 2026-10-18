export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ServiceWindow {
  start: string;
  end: string;
}

export type RequestOrigin = "referral" | "radar";

export type Urgency = "low" | "normal" | "high";

export type ConsentState = "pending" | "granted" | "denied";

export interface ServiceRequest {
  id: string;
  origin: RequestOrigin;
  requesterId: string;
  serviceId: string;
  location: LocationPrecision;
  radiusKm: number;
  window: ServiceWindow;
  urgency: Urgency;
  budgetMin?: number;
  budgetMax?: number;
  consent: ConsentState;
  createdAt: string;
  expiresAt: string;
}

export interface ProviderCapacity {
  providerId: string;
  serviceIds: string[];
  location: LocationPrecision;
  serviceRadiusKm: number;
  windows: ServiceWindow[];
  weeklyCapacity: number;
  accepting: boolean;
  confirmed: boolean;
  updatedAt: string;
}

/**
 * Onde um prestador atende ou onde a demanda foi manifestada.
 *
 * `coordinates` permite calcular distancia. `neighborhood` permite apenas
 * comparacao regional declarada. `unknown` nao sustenta nenhum calculo.
 *
 * Um prestador com localizacao apenas regional ou desconhecida NAO e descartado
 * em silencio: ele aparece sem evidencia geodesica, e o dominio decide.
 */
export type LocationPrecision =
  | { mode: "coordinates"; point: GeoPoint }
  | { mode: "neighborhood"; neighborhood: string; city?: string; state?: string }
  | { mode: "unknown" };

export interface CriterionContext {
  request: ServiceRequest;
  capacity: ProviderCapacity;
  /**
   * Distancia em km, ou `null` quando nao ha coordenadas suficientes.
   * `null` significa "nao calculado" e e distinto de `0`, que e uma distancia
   * real de zero.
   */
  distanceKm: number | null;
}

export interface CriterionResult {
  passed: boolean;
  reason: string;
  /**
   * `true` quando o bloqueio decorre de ausencia de dado, nao de incompatibilidade.
   * Permite ao dominio contabilizar "bloqueado por falta de informacao".
   */
  inconclusive?: boolean;
}

export interface CompatibilityCriterion {
  id: string;
  label: string;
  weight: number;
  evaluate(context: CriterionContext): CriterionResult;
}

export interface MatchCandidate {
  providerId: string;
  score: number;
  reasons: string[];
  blockers: string[];
  /** Verdadeiro quando faltou dado para calcular distancia. Nao e o mesmo que estar longe. */
  inconclusive?: boolean;
}

export interface MatchResult {
  requestId: string;
  candidates: MatchCandidate[];
  potentialRecoverable: number;
  matchableCount: number;
  /** Candidatos sem evidencia geodesica suficiente. */
  inconclusiveCount: number;
}

export interface OpportunityEstimate {
  excessDemand: number;
  freeCapacity: number;
  potentialRecoverable: number;
}

export type HandoffStatus =
  | "requested"
  | "offered"
  | "accepted"
  | "declined"
  | "completed"
  | "expired"
  | "cancelled";

export type HandoffEvent =
  | "offer"
  | "clientAccept"
  | "clientDecline"
  | "providerConfirm"
  | "providerDecline"
  | "complete"
  | "expire"
  | "cancel";

export interface HandoffDecision {
  actor: "client" | "provider";
  decision: "accepted" | "declined";
  at: string;
}

export interface Handoff {
  id: string;
  requestId: string;
  providerId: string;
  status: HandoffStatus;
  clientDecision?: HandoffDecision;
  providerDecision?: HandoffDecision;
  updatedAt: string;
}

export interface FailureReason {
  reason: string;
  count: number;
}

export interface CapacityMetrics {
  requestsReceived: number;
  requestsUnfulfilled: number;
  matchesProposed: number;
  handoffsOffered: number;
  handoffsClientAccepted: number;
  handoffsProviderConfirmed: number;
  handoffsCompleted: number;
  handoffsDeclined: number;
  handoffsExpired: number;
  handoffsCancelled: number;
  potentialRecoverable: number;
  matchableCount: number;
  completedCount: number;
  failures: FailureReason[];
}

export interface NetworkDensity {
  verticalScope: string;
  radiusKm: number;
  serviceId: string;
  compatibleProviders: number;
  acceptingProviders: number;
  confirmedProviders: number;
  /** Compatibilidade verificada por distancia calculada. */
  providersWithCoordinates: number;
  /** Compatibilidade por regiao declarada. Sem distancia calculada. */
  providersRegionalOnly: number;
  /** Sem localizacao alguma. Nao sustenta nenhuma contagem. */
  providersWithoutLocation: number;
}

export type ReadinessStatus = "not-ready" | "pilot-eligible" | "radar-eligible";

export interface ReadinessThresholds {
  minCompatibleProviders: number;
  minConfirmedProviders: number;
  minRecordedRequests: number;
  minCompletedHandoffs: number;
}

export interface NetworkReadiness {
  density: NetworkDensity;
  recordedRequests: number;
  completedHandoffs: number;
  status: ReadinessStatus;
  unmet: string[];
}
