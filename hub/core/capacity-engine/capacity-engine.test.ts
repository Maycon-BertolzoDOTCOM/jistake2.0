import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  Handoff,
  InvalidCoordinateError,
  InvalidTransitionError,
  ProviderCapacity,
  ServiceRequest,
  advanceHandoff,
  assessReadiness,
  canTransition,
  computeCapacityMetrics,
  defaultCriteria,
  estimateOpportunity,
  haversineKm,
  isTerminal,
  isValidGeoPoint,
  matchRequest,
  networkDensity,
} from "./src/index";

const SAO_PAULO = { lat: -23.5505, lng: -46.6333 };

function request(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: "req-1",
    origin: "referral",
    requesterId: "prov-a",
    serviceId: "svc-1",
    location: SAO_PAULO,
    radiusKm: 5,
    window: { start: "2026-03-02T09:00:00.000Z", end: "2026-03-02T18:00:00.000Z" },
    urgency: "normal",
    consent: "granted",
    createdAt: "2026-03-01T12:00:00.000Z",
    expiresAt: "2026-03-05T00:00:00.000Z",
    ...overrides,
  };
}

function capacity(overrides: Partial<ProviderCapacity> = {}): ProviderCapacity {
  return {
    providerId: "prov-b",
    serviceIds: ["svc-1"],
    location: SAO_PAULO,
    serviceRadiusKm: 10,
    windows: [{ start: "2026-03-02T10:00:00.000Z", end: "2026-03-02T15:00:00.000Z" }],
    weeklyCapacity: 5,
    accepting: true,
    confirmed: true,
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

function handoff(overrides: Partial<Handoff> = {}): Handoff {
  return {
    id: "ho-1",
    requestId: "req-1",
    providerId: "prov-b",
    status: "requested",
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("geo: haversineKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineKm(SAO_PAULO, SAO_PAULO)).toBe(0);
  });

  it("computes a known distance within tolerance", () => {
    const rio = { lat: -22.9068, lng: -43.1729 };
    const km = haversineKm(SAO_PAULO, rio);
    expect(km).toBeGreaterThan(350);
    expect(km).toBeLessThan(370);
  });

  it("is symmetric", () => {
    const a = { lat: -23.5, lng: -46.6 };
    const b = { lat: -23.6, lng: -46.7 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("rejects out-of-range latitude", () => {
    expect(() => haversineKm({ lat: 91, lng: 0 }, SAO_PAULO)).toThrow(InvalidCoordinateError);
  });

  it("rejects out-of-range longitude", () => {
    expect(() => haversineKm({ lat: 0, lng: 181 }, SAO_PAULO)).toThrow(InvalidCoordinateError);
  });

  it("rejects non-finite coordinates", () => {
    expect(() => haversineKm({ lat: Number.NaN, lng: 0 }, SAO_PAULO)).toThrow(InvalidCoordinateError);
  });

  it("validates points without throwing", () => {
    expect(isValidGeoPoint({ lat: 0, lng: 0 })).toBe(true);
    expect(isValidGeoPoint({ lat: 0, lng: 200 })).toBe(false);
    expect(isValidGeoPoint(null)).toBe(false);
  });
});

describe("opportunity: theoretical ceiling", () => {
  it("computes min(excessDemand, freeCapacity)", () => {
    expect(estimateOpportunity(12, 5).potentialRecoverable).toBe(5);
  });

  it("caps at excess demand when capacity is larger", () => {
    expect(estimateOpportunity(4, 9).potentialRecoverable).toBe(4);
  });

  it("is zero when nothing is free", () => {
    expect(estimateOpportunity(12, 0).potentialRecoverable).toBe(0);
  });

  it("rejects negative inputs", () => {
    expect(() => estimateOpportunity(-1, 5)).toThrow(RangeError);
  });
});

describe("matching", () => {
  it("finds a compatible provider", () => {
    const result = matchRequest(request(), [capacity()], defaultCriteria());
    expect(result.matchableCount).toBe(1);
    expect(result.candidates[0]?.blockers).toEqual([]);
  });

  it("returns zero when no provider is compatible", () => {
    const result = matchRequest(request(), [capacity({ accepting: false })], defaultCriteria());
    expect(result.matchableCount).toBe(0);
    expect(result.candidates[0]?.blockers.length).toBeGreaterThan(0);
  });

  it("blocks when the service does not match even at zero distance", () => {
    const result = matchRequest(request(), [capacity({ serviceIds: ["svc-other"] })], defaultCriteria());
    expect(result.matchableCount).toBe(0);
    expect(result.candidates[0]?.blockers).toContain("Provider does not offer svc-1");
  });

  it("blocks when the provider is beyond the requested radius", () => {
    const far = { lat: -23.7, lng: -46.8 };
    const result = matchRequest(request({ radiusKm: 1 }), [capacity({ location: far })], defaultCriteria());
    expect(result.matchableCount).toBe(0);
    expect(result.candidates[0]?.blockers.join(" ")).toContain("Outside requested radius");
  });

  it("blocks when availability was never confirmed", () => {
    const result = matchRequest(request(), [capacity({ confirmed: false })], defaultCriteria());
    expect(result.matchableCount).toBe(0);
    expect(result.candidates[0]?.blockers).toContain("Availability was never confirmed");
  });

  it("blocks when there is no window overlap", () => {
    const result = matchRequest(
      request(),
      [capacity({ windows: [{ start: "2026-04-01T10:00:00.000Z", end: "2026-04-01T15:00:00.000Z" }] })],
      defaultCriteria(),
    );
    expect(result.matchableCount).toBe(0);
  });

  it("blocks when consent was not granted", () => {
    const result = matchRequest(request({ consent: "pending" }), [capacity()], defaultCriteria());
    expect(result.matchableCount).toBe(0);
    expect(result.candidates[0]?.blockers).toContain('Client consent is "pending"');
  });

  it("never matches the requester against itself", () => {
    const result = matchRequest(request(), [capacity({ providerId: "prov-a" })], defaultCriteria());
    expect(result.candidates).toEqual([]);
    expect(result.matchableCount).toBe(0);
  });

  it("explains every outcome and stays deterministic", () => {
    const first = matchRequest(request(), [capacity()], defaultCriteria());
    const second = matchRequest(request(), [capacity()], defaultCriteria());
    expect(first).toEqual(second);
    expect(first.candidates[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("never reports more matches than the theoretical ceiling", () => {
    const result = matchRequest(request(), [capacity(), capacity({ providerId: "prov-c" })], defaultCriteria());
    expect(result.matchableCount).toBeLessThanOrEqual(result.potentialRecoverable);
  });
});

describe("handoff state machine", () => {
  it("walks the full happy path", () => {
    let h = handoff();
    h = advanceHandoff(h, "offer", { at: "2026-03-01T13:00:00.000Z" });
    expect(h.status).toBe("offered");
    h = advanceHandoff(h, "clientAccept", { at: "2026-03-01T14:00:00.000Z" });
    expect(h.status).toBe("accepted");
    expect(h.clientDecision?.actor).toBe("client");
    h = advanceHandoff(h, "providerConfirm", { at: "2026-03-01T15:00:00.000Z" });
    expect(h.providerDecision?.decision).toBe("accepted");
    h = advanceHandoff(h, "complete", { at: "2026-03-02T10:00:00.000Z" });
    expect(h.status).toBe("completed");
  });

  it("records the client and the provider as distinct decisions", () => {
    let h = advanceHandoff(handoff(), "offer", { at: "2026-03-01T13:00:00.000Z" });
    h = advanceHandoff(h, "clientAccept", { at: "2026-03-01T14:00:00.000Z" });
    expect(h.clientDecision?.actor).toBe("client");
    expect(h.providerDecision).toBeUndefined();
  });

  it("allows either side to decline", () => {
    const offered = advanceHandoff(handoff(), "offer", { at: "2026-03-01T13:00:00.000Z" });
    expect(advanceHandoff(offered, "clientDecline", { at: "2026-03-01T14:00:00.000Z" }).status).toBe("declined");
    expect(advanceHandoff(offered, "providerDecline", { at: "2026-03-01T14:00:00.000Z" }).status).toBe("declined");
  });

  it("rejects an invalid transition", () => {
    expect(() => advanceHandoff(handoff(), "complete", { at: "2026-03-01T13:00:00.000Z" })).toThrow(InvalidTransitionError);
  });

  it("refuses to complete without provider confirmation", () => {
    let h = advanceHandoff(handoff(), "offer", { at: "2026-03-01T13:00:00.000Z" });
    h = advanceHandoff(h, "clientAccept", { at: "2026-03-01T14:00:00.000Z" });
    expect(() => advanceHandoff(h, "complete", { at: "2026-03-02T10:00:00.000Z" })).toThrow(/provider confirms/);
  });

  it("treats terminal states as final", () => {
    const done = { ...handoff(), status: "completed" as const };
    expect(isTerminal(done.status)).toBe(true);
    expect(() => advanceHandoff(done, "cancel", { at: "2026-03-03T10:00:00.000Z" })).toThrow(InvalidTransitionError);
  });

  it("exposes the transition table", () => {
    expect(canTransition("requested", "offer")).toBe(true);
    expect(canTransition("requested", "complete")).toBe(false);
  });
});

describe("metrics", () => {
  it("separates theoretical ceiling from real completions", () => {
    const offered = advanceHandoff(handoff(), "offer", { at: "2026-03-01T13:00:00.000Z" });
    const accepted = advanceHandoff(offered, "clientAccept", { at: "2026-03-01T14:00:00.000Z" });
    const confirmed = advanceHandoff(accepted, "providerConfirm", { at: "2026-03-01T15:00:00.000Z" });
    const done = advanceHandoff(confirmed, "complete", { at: "2026-03-02T10:00:00.000Z" });

    const metrics = computeCapacityMetrics({
      requestsReceived: 12,
      requestsUnfulfilled: 12,
      handoffs: [offered, done],
      matchableCount: 5,
      blockedReasons: ["Outside requested radius", "Provider does not offer svc-1", "Outside requested radius"],
    });

    expect(metrics.potentialRecoverable).toBe(5);
    expect(metrics.matchableCount).toBe(5);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.handoffsCompleted).toBe(1);
    expect(metrics.handoffsClientAccepted).toBe(1);
    expect(metrics.failures[0]).toEqual({ reason: "Outside requested radius", count: 2 });
  });

  it("refuses to report more completions than matches", () => {
    const done = { ...handoff(), status: "completed" as const };
    expect(() =>
      computeCapacityMetrics({ requestsReceived: 1, requestsUnfulfilled: 1, handoffs: [done], matchableCount: 0 }),
    ).toThrow(/cannot exceed matchableCount/);
  });
});

describe("readiness", () => {
  const three = [
    capacity({ providerId: "p1" }),
    capacity({ providerId: "p2" }),
    capacity({ providerId: "p3" }),
  ];

  it("counts only compatible providers in range", () => {
    const density = networkDensity(three, "svc-1", 5, SAO_PAULO, "beauty");
    expect(density.compatibleProviders).toBe(3);
    expect(density.verticalScope).toBe("beauty");
  });

  it("ignores providers outside the radius", () => {
    const density = networkDensity([...three, capacity({ providerId: "far", location: { lat: -23.8, lng: -46.9 } })], "svc-1", 5, SAO_PAULO);
    expect(density.compatibleProviders).toBe(3);
  });

  it("is not-ready below the pilot threshold", () => {
    const density = networkDensity([capacity({ providerId: "p1" })], "svc-1", 5, SAO_PAULO);
    const readiness = assessReadiness(density, 50, 50);
    expect(readiness.status).toBe("not-ready");
    expect(readiness.unmet.join(" ")).toContain("compatibleProviders 1 < 3");
  });

  it("is pilot-eligible once enough providers exist, before any volume", () => {
    const density = networkDensity(three, "svc-1", 5, SAO_PAULO);
    expect(assessReadiness(density, 0, 0).status).toBe("pilot-eligible");
  });

  it("is pilot-eligible with providers but no volume yet", () => {
    const density = networkDensity(three, "svc-1", 5, SAO_PAULO);
    const readiness = assessReadiness(density, 10, 0);
    expect(readiness.status).toBe("pilot-eligible");
    expect(readiness.unmet.join(" ")).toContain("completedHandoffs");
  });

  it("only becomes radar-eligible once the pilot actually produced outcomes", () => {
    const density = networkDensity(three, "svc-1", 5, SAO_PAULO);
    expect(assessReadiness(density, 12, 1).status).toBe("radar-eligible");
  });

  it("exposes the documented gate thresholds", () => {
    expect(DEFAULT_THRESHOLDS.minCompatibleProviders).toBe(3);
    expect(DEFAULT_THRESHOLDS.minRecordedRequests).toBe(10);
  });
});
