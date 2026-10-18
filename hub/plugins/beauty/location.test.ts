import { describe, expect, it } from "vitest";
import {
  normalizeNeighborhood,
  resolveLocation,
  sameNeighborhood,
  type ProviderLocation,
} from "./src/location";
import {
  matchByAvailablePrecision,
  matchGeographically,
  matchRegionally,
  isVerifiedEvidence,
  canMatchOnLocation,
} from "./src/location-matching";
import { auditLocationMatching, regionsAgree } from "./src/location-audit";

const SP = { lat: -23.5505, lng: -46.6333 };

describe("location: valid coordinates", () => {
  it("resolves to coordinates mode", () => {
    const result = resolveLocation({ lat: -23.55, lng: -46.63 });
    expect(result.location.mode).toBe("coordinates");
    expect(result.invalidCoordinates).toBeUndefined();
  });

  it("accepts the extremes of the valid range", () => {
    expect(resolveLocation({ lat: -90, lng: -180 }).location.mode).toBe("coordinates");
    expect(resolveLocation({ lat: 90, lng: 180 }).location.mode).toBe("coordinates");
    expect(resolveLocation({ lat: 0, lng: 0 }).location.mode).toBe("coordinates");
  });

  it("prefers coordinates over a declared neighborhood", () => {
    const result = resolveLocation({ lat: -23.55, lng: -46.63, neighborhood: "Vila Nova" });
    expect(result.location.mode).toBe("coordinates");
  });
});

describe("location: invalid coordinates are rejected, never zeroed", () => {
  it("rejects latitude out of range", () => {
    const result = resolveLocation({ lat: 91, lng: 0 });
    expect(result.location.mode).not.toBe("coordinates");
    expect(result.invalidCoordinates).toBe(true);
  });

  it("rejects longitude out of range", () => {
    const result = resolveLocation({ lat: 0, lng: 181 });
    expect(result.location.mode).not.toBe("coordinates");
    expect(result.invalidCoordinates).toBe(true);
  });

  it("rejects NaN and infinity", () => {
    expect(resolveLocation({ lat: Number.NaN, lng: 0 }).invalidCoordinates).toBe(true);
    expect(resolveLocation({ lat: 0, lng: Number.POSITIVE_INFINITY }).invalidCoordinates).toBe(true);
  });

  it("rejects non-numeric values", () => {
    expect(resolveLocation({ lat: "-23.5", lng: "-46.6" }).invalidCoordinates).toBe(true);
  });

  it("never turns an invalid coordinate into zero", () => {
    const result = resolveLocation({ lat: 500, lng: 500 });
    expect(result.location.mode).toBe("unknown");
  });

  it("never infers a neighborhood from an invalid coordinate", () => {
    const result = resolveLocation({ lat: 999, lng: 0, neighborhood: "Vila Nova" });
    expect(result.location.mode).toBe("unknown");
  });

  it("does not silently discard other data", () => {
    const result = resolveLocation({ lat: 999, address: "Rua X, 100" });
    expect(result.address).toBe("Rua X, 100");
  });
});

describe("location: backwards compatibility with legacy documents", () => {
  it("resolves a legacy document with only an address to unknown", () => {
    const result = resolveLocation({ address: "Rua X, 100" });
    expect(result.location.mode).toBe("unknown");
    expect(result.address).toBe("Rua X, 100");
    expect(result.reason).toContain("Sem coordenadas");
  });

  it("resolves an empty document to unknown without throwing", () => {
    expect(resolveLocation(undefined).location.mode).toBe("unknown");
    expect(resolveLocation({}).location.mode).toBe("unknown");
  });
});

describe("location: neighborhood comparison", () => {
  it("normalizes case, accents and spacing", () => {
    expect(normalizeNeighborhood("  Vila   Nova  ")).toBe("vila nova");
    expect(normalizeNeighborhood("São João")).toBe("sao joao");
  });

  it("treats the same neighborhood as equal", () => {
    const left: ProviderLocation = {
      mode: "neighborhood",
      neighborhood: "Vila Nova York",
      city: "São Paulo",
      state: "SP",
    };
    const right: ProviderLocation = {
      mode: "neighborhood",
      neighborhood: "vila  nova york",
      city: "Sao Paulo",
      state: "sp",
    };
    expect(sameNeighborhood(left, right)).toBe(true);
  });

  it("treats homonymous neighborhoods in different cities as different", () => {
    const left: ProviderLocation = {
      mode: "neighborhood",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
    };
    const right: ProviderLocation = {
      mode: "neighborhood",
      neighborhood: "Centro",
      city: "Campinas",
      state: "SP",
    };
    expect(sameNeighborhood(left, right)).toBe(false);
    expect(regionsAgree(left, right)).toBe(false);
  });

  it("treats homonymous neighborhoods in different states as different", () => {
    const left: ProviderLocation = { mode: "neighborhood", neighborhood: "Centro", city: "Centro", state: "SP" };
    const right: ProviderLocation = { mode: "neighborhood", neighborhood: "Centro", city: "Centro", state: "RJ" };
    expect(sameNeighborhood(left, right)).toBe(false);
  });

  it("does not consider neighborhoods equal without a city", () => {
    const left: ProviderLocation = { mode: "neighborhood", neighborhood: "Centro" };
    const right: ProviderLocation = { mode: "neighborhood", neighborhood: "Centro", city: "São Paulo" };
    expect(sameNeighborhood(left, right)).toBe(false);
  });
});

describe("location matching: geographic evidence is calculated", () => {
  const coordinates = (lat: number, lng: number): ProviderLocation => ({
    mode: "coordinates",
    point: { lat, lng },
  });

  it("calculates a real distance", () => {
    const match = matchGeographically(coordinates(-23.55, -46.63), coordinates(-23.56, -46.64), 5, 5);
    expect(match?.kind).toBe("geographic");
    expect(match?.distanceKm).toBeGreaterThan(0);
    expect(match?.distanceKm).toBeLessThan(5);
  });

  it("returns zero distance only when points are identical", () => {
    expect(matchGeographically(coordinates(-23.55, -46.63), coordinates(-23.55, -46.63), 5, 5)?.distanceKm).toBe(0);
  });

  it("returns null rather than zero when a side has no coordinates", () => {
    const unknown: ProviderLocation = { mode: "unknown" };
    expect(matchGeographically(coordinates(-23.55, -46.63), unknown, 5, 5)).toBeNull();
    expect(matchGeographically(unknown, coordinates(-23.55, -46.63), 5, 5)).toBeNull();
  });

  it("distinguishes request radius from provider reach", () => {
    // Distancia real entre os pontos: ~0.75 km.
    const near = coordinates(-23.555, -46.635);
    const other = coordinates(-23.56, -46.64);

    const withinRequest = matchGeographically(near, other, 5, 0.5);
    expect(withinRequest?.withinRequestRadius).toBe(true);
    expect(withinRequest?.withinProviderReach).toBe(false);

    const withinReach = matchGeographically(near, other, 0.5, 5);
    expect(withinReach?.withinRequestRadius).toBe(false);
    expect(withinReach?.withinProviderReach).toBe(true);

    const withinBoth = matchGeographically(near, other, 5, 5);
    expect(withinBoth?.withinRequestRadius).toBe(true);
    expect(withinBoth?.withinProviderReach).toBe(true);
  });
});

describe("location matching: regional evidence is never a distance", () => {
  const neighborhood = (name: string, city = "São Paulo"): ProviderLocation => ({
    mode: "neighborhood",
    neighborhood: name,
    city,
    state: "SP",
  });

  it("matches same region without calculating distance", () => {
    const match = matchRegionally(neighborhood("Vila Nova"), neighborhood("Vila Nova"));
    expect(match?.kind).toBe("regional");
    expect(match?.approximate).toBe(true);
    expect(match).not.toHaveProperty("distanceKm");
    expect(match?.reason).toContain("NAO calculada");
  });

  it("does not match different regions", () => {
    expect(matchRegionally(neighborhood("Vila Nova"), neighborhood("Tatuapé"))).toBeNull();
  });

  it("does not match homonymous regions in different cities", () => {
    expect(matchRegionally(neighborhood("Centro", "São Paulo"), neighborhood("Centro", "Campinas"))).toBeNull();
  });

  it("never promotes a regional match to geographic evidence", () => {
    const match = matchByAvailablePrecision(neighborhood("Vila Nova"), neighborhood("Vila Nova"), 5, 5);
    expect(match?.kind).toBe("regional");
    expect(isVerifiedEvidence(match!)).toBe(false);
  });
});

describe("location matching: precision is never assumed", () => {
  const coordinates: ProviderLocation = { mode: "coordinates", point: SP };
  const neighborhood: ProviderLocation = { mode: "neighborhood", neighborhood: "Vila Nova", city: "São Paulo" };

  it("does not conclude anything when precision differs", () => {
    const match = matchByAvailablePrecision(coordinates, neighborhood, 5, 5);
    expect(match).toBeNull();
  });

  it("blocks matching when a side is unknown", () => {
    expect(canMatchOnLocation({ mode: "unknown" })).toBe(false);
    expect(matchByAvailablePrecision(coordinates, { mode: "unknown" }, 5, 5)).toBeNull();
  });
});

describe("audit: geographic and regional matches are counted separately", () => {
  const auditInput = {
    requests: [
      { id: "r1", location: { mode: "coordinates", point: SP } as ProviderLocation, radiusKm: 5 },
      {
        id: "r2",
        location: {
          mode: "neighborhood",
          neighborhood: "Vila Nova",
          city: "São Paulo",
          state: "SP",
        } as ProviderLocation,
        radiusKm: 5,
      },
    ],
    providers: [
      { id: "p1", location: { mode: "coordinates", point: SP } as ProviderLocation, reachKm: 5 },
      {
        id: "p2",
        location: {
          mode: "neighborhood",
          neighborhood: "Vila Nova",
          city: "São Paulo",
          state: "SP",
        } as ProviderLocation,
        reachKm: 5,
      },
    ],
  };

  it("separates evidence kinds in the summary", () => {
    const { summary } = auditLocationMatching(auditInput);
    expect(summary.geographicMatches).toBe(1);
    expect(summary.regionalMatches).toBe(1);
    expect(summary.requestsWithCoordinates).toBe(1);
    expect(summary.requestsRegionalOnly).toBe(1);
    expect(summary.providersWithCoordinates).toBe(1);
    expect(summary.providersRegionalOnly).toBe(1);
  });

  it("marks mixed-precision pairs as inconclusive", () => {
    const { entries } = auditLocationMatching(auditInput);
    const mixed = entries.filter((entry) => entry.reason === "inconclusive-mixed-precision");
    expect(mixed).toHaveLength(2);
    expect(mixed.every((entry) => entry.evidence === "none")).toBe(true);
  });

  it("records the reason for every pair", () => {
    const { entries } = auditLocationMatching(auditInput);
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.detail.length > 0)).toBe(true);
  });

  it("blocks invalid coordinates before any calculation", () => {
    const { entries, summary } = auditLocationMatching({
      requests: [{ id: "r1", location: { mode: "coordinates", point: SP }, radiusKm: 5 }],
      providers: [
        { id: "p1", location: { mode: "coordinates", point: SP }, reachKm: 5, invalidCoordinates: true },
      ],
    });
    expect(entries[0]?.reason).toBe("blocked-invalid-coordinates");
    expect(entries[0]?.evidence).toBe("none");
    expect(summary.geographicMatches).toBe(0);
  });

  it("blocks pairs where location is insufficient", () => {
    const { summary } = auditLocationMatching({
      requests: [{ id: "r1", location: { mode: "unknown" }, radiusKm: 5 }],
      providers: [{ id: "p1", location: { mode: "coordinates", point: SP }, reachKm: 5 }],
    });
    expect(summary.blockedForLocation).toBe(1);
    expect(summary.requestsWithoutLocation).toBe(1);
  });

  it("blocks when both sides are regional but different", () => {
    const { entries } = auditLocationMatching({
      requests: [
        {
          id: "r1",
          location: { mode: "neighborhood", neighborhood: "Vila Nova", city: "São Paulo" },
          radiusKm: 5,
        },
      ],
      providers: [
        {
          id: "p1",
          location: { mode: "neighborhood", neighborhood: "Tatuapé", city: "São Paulo" },
          reachKm: 5,
        },
      ],
    });
    expect(entries[0]?.outcome).toBe("blocked");
    expect(entries[0]?.evidence).toBe("none");
  });
});
