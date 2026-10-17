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
  location: GeoPoint;
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
  location: GeoPoint;
  serviceRadiusKm: number;
  windows: ServiceWindow[];
  weeklyCapacity: number;
  accepting: boolean;
  confirmed: boolean;
  updatedAt: string;
}

export interface CriterionContext {
  request: ServiceRequest;
  capacity: ProviderCapacity;
  distanceKm: number;
}

export interface CriterionResult {
  passed: boolean;
  reason: string;
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
}

export interface MatchResult {
  requestId: string;
  candidates: MatchCandidate[];
  potentialRecoverable: number;
  matchableCount: number;
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
