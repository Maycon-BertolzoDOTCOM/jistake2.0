import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  assessReadiness,
  computeCapacityMetrics,
  defaultCriteria,
  matchRequest,
  networkDensity,
  type Handoff,
  type NetworkDensity,
  type ProviderCapacity,
  type ServiceRequest,
} from "./src/index";

const NO = "2026-03-02T09:00:00.000Z";
const at = (lat: number, lng: number) => ({ mode: "coordinates" as const, point: { lat, lng } });
const regional = (name: string, city?: string, state?: string) => ({
  mode: "neighborhood" as const,
  neighborhood: name,
  city,
  state,
});

function request(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: "req-1",
    origin: "referral",
    requesterId: "prov-a",
    serviceId: "svc-1",
    location: at(-23.5505, -46.6333),
    radiusKm: 5,
    window: { start: "2026-03-02T08:00:00.000Z", end: "2026-03-02T20:00:00.000Z" },
    urgency: "normal",
    consent: "granted",
    createdAt: NO,
    expiresAt: NO,
    ...overrides,
  };
}

function capacity(overrides: Partial<ProviderCapacity> = {}): ProviderCapacity {
  return {
    providerId: "prov-b",
    serviceIds: ["svc-1"],
    location: at(-23.5505, -46.6333),
    serviceRadiusKm: 10,
    windows: [{ start: "2026-03-02T08:00:00.000Z", end: "2026-03-02T20:00:00.000Z" }],
    weeklyCapacity: 5,
    accepting: true,
    confirmed: true,
    updatedAt: NO,
    ...overrides,
  };
}

const SP = at(-23.5505, -46.6333);

describe("audit BUG-1: the declared shape matches the real implementation", () => {
  it("declares distanceKm as nullable in the extension contract", async () => {
    const contract = await import("@hub/reactor-config");
    // O shape declarado precisa aceitar o mesmo contexto que o motor produz.
    const descriptor: contract.CapacityCriterionDescriptor = {
      id: "probe",
      label: "Probe",
      weight: 1,
      evaluate: (context) => ({
        passed: context.distanceKm === null,
        reason: String(context.distanceKm),
        inconclusive: context.distanceKm === null,
      }),
    };
    expect(descriptor.evaluate({ request: null, capacity: null, distanceKm: null }).inconclusive).toBe(true);
    expect(descriptor.evaluate({ request: null, capacity: null, distanceKm: 0 }).inconclusive).toBe(false);
  });

  it("accepts a real criterion as the declared shape", async () => {
    const contract = await import("@hub/reactor-config");
    const real = defaultCriteria()[0]!;
    const declared: contract.CapacityCriterionDescriptor = real;
    expect(declared.id).toBe("consent");
  });
});

describe("audit BUG-2: absence of data is never reported as incompatibility", () => {
  it("keeps inconclusive separate from blockers", () => {
    const result = matchRequest(request(), [capacity({ location: regional("Vila Nova") })], defaultCriteria());
    const candidate = result.candidates[0]!;

    expect(candidate.inconclusive).toBe(true);
    expect(candidate.inconclusiveBlockers.length).toBeGreaterThan(0);
    expect(candidate.blockers).not.toContain("Distance not calculated: no coordinates available");
  });

  it("does not count an inconclusive criterion as passed", () => {
    const withData = matchRequest(request(), [capacity()], defaultCriteria());
    const withoutData = matchRequest(request(), [capacity({ location: regional("Vila Nova") })], defaultCriteria());

    // Com coordenadas, todos os criterios passam.
    expect(withData.matchableCount).toBe(1);
    expect(withData.candidates[0]!.inconclusive).toBe(false);

    // Sem coordenadas, os criterios de distancia viram inconclusivos e pesam
    // contra o score: nunca contam como aprovados.
    expect(withoutData.matchableCount).toBe(0);
    expect(withoutData.candidates[0]!.score).toBeLessThan(withData.candidates[0]!.score);
    expect(withoutData.candidates[0]!.inconclusiveBlockers.length).toBeGreaterThan(0);
  });

  it("reports a verified incompatibility without the inconclusive flag", () => {
    const result = matchRequest(
      request({ serviceId: "svc-other" }),
      [capacity()],
      defaultCriteria(),
    );
    const candidate = result.candidates[0]!;
    expect(candidate.blockers.length).toBeGreaterThan(0);
    expect(candidate.inconclusive).toBe(false);
    expect(candidate.inconclusiveBlockers).toEqual([]);
  });

  it("never converts an unknown distance into zero", () => {
    const result = matchRequest(request(), [capacity({ location: { mode: "unknown" } })], defaultCriteria());
    const candidate = result.candidates[0]!;
    expect(candidate.inconclusive).toBe(true);
    expect(candidate.reasons.some((reason) => reason.includes("0.00 km"))).toBe(false);
  });
});

describe("audit BUG-4: regional density does not open the pilot gate", () => {
  const regionalOnly = (count: number): ProviderCapacity[] =>
    Array.from({ length: count }, (_, index) =>
      capacity({ providerId: `p${index}`, location: regional("Centro", "Sao Paulo", "SP") }),
    );

  function densityOf(capacities: ProviderCapacity[]): NetworkDensity {
    return networkDensity(capacities, "svc-1", 5, SP, "beauty");
  }

  it("counts regional providers separately from geographic ones", () => {
    const density = densityOf([...regionalOnly(2), capacity({ providerId: "geo" })]);
    expect(density.compatibleProviders).toBe(3);
    expect(density.providersWithCoordinates).toBe(1);
    expect(density.providersRegionalOnly).toBe(2);
    expect(density.providersWithoutLocation).toBe(0);
  });

  it("never sums the same provider twice", () => {
    const density = densityOf([
      ...regionalOnly(3),
      capacity({ providerId: "geo" }),
      capacity({ providerId: "none", location: { mode: "unknown" } }),
    ]);
    // Cada provider aparece em exatamente uma categoria.
    const categorized =
      density.providersWithCoordinates +
      density.providersRegionalOnly +
      density.providersWithoutLocation;
    expect(categorized).toBe(5);
    // ...e providers sem localizacao nunca contam como compativeis.
    expect(density.compatibleProviders).toBe(
      density.providersWithCoordinates + density.providersRegionalOnly,
    );
    expect(density.compatibleProviders).toBe(4);
  });

  it("keeps the pilot blocked when every provider is regional only", () => {
    const readiness = assessReadiness(densityOf(regionalOnly(3)), 10, 1);
    expect(readiness.status).toBe("not-ready");
    expect(readiness.unmet.join(" ")).toContain("providersWithCoordinates");
  });

  it("allows the pilot once geographic density exists", () => {
    const readiness = assessReadiness(
      densityOf([capacity({ providerId: "g1" }), capacity({ providerId: "g2" }), capacity({ providerId: "g3" })]),
      10,
      0,
    );
    expect(readiness.status).toBe("pilot-eligible");
  });

  it("never opens the radar gate without geographic density", () => {
    const readiness = assessReadiness(densityOf(regionalOnly(5)), 100, 50);
    expect(readiness.status).not.toBe("radar-eligible");
  });

  it("exposes a dedicated coordinate threshold", () => {
    expect(DEFAULT_THRESHOLDS.minProvidersWithCoordinates).toBe(3);
  });

  it("counts providers without location as not compatible at all", () => {
    const density = densityOf([
      capacity({ providerId: "a", location: { mode: "unknown" } }),
      capacity({ providerId: "b", location: { mode: "unknown" } }),
      capacity({ providerId: "c", location: { mode: "unknown" } }),
    ]);
    expect(density.compatibleProviders).toBe(0);
    expect(density.providersWithoutLocation).toBe(3);
  });
});

describe("audit: invariants survive location uncertainty", () => {
  it("keeps completed <= matchable <= potential", () => {
    const noData = matchRequest(request(), [capacity({ location: { mode: "unknown" } })], defaultCriteria());
    expect(noData.matchableCount).toBe(0);
    expect(noData.inconclusiveCount).toBe(1);
    expect(noData.potentialRecoverable).toBe(0);
  });

  it("refuses to report completions above matches", () => {
    const done: Handoff = {
      id: "h1",
      requestId: "req-1",
      providerId: "prov-b",
      status: "completed",
      updatedAt: NO,
    };
    expect(() =>
      computeCapacityMetrics({
        requestsReceived: 1,
        requestsUnfulfilled: 1,
        handoffs: [done],
        matchableCount: 0,
      }),
    ).toThrow(/cannot exceed matchableCount/);
  });

  it("keeps the theoretical ceiling honest with regional-only data", () => {
    const result = matchRequest(
      request({ location: regional("Centro", "Sao Paulo", "SP") }),
      [capacity({ location: regional("Centro", "Sao Paulo", "SP") })],
      defaultCriteria(),
    );
    // Regional pode ser compativel, mas nao produz correspondencia geodesica.
    expect(result.matchableCount).toBe(0);
    expect(result.candidates).toHaveLength(1);
  });
});
