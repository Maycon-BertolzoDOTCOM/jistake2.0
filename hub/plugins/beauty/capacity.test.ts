import { describe, expect, it } from "vitest";
import {
  adaptCapacities,
  adaptRequests,
  beautyCapacityCriteria,
  beautyCriteria,
  BEAUTY_DEFAULT_RADIUS_KM,
  BEAUTY_MAX_RADIUS_KM,
  BEAUTY_SCOPE,
  type BeautyOperationalDocument,
} from "./src/capacity";
import { assessBeautyCapacity, describeBeautyCapacity } from "./src/capacity-readiness";
import { beautyParser } from "./src/parser";

const NOW = "2026-03-02T09:00:00.000Z";
/** Intervalo com duracao declarada: unica forma que prova agenda livre. */
const SLOT = "2026-03-02T09:00:00.000Z/2026-03-02T12:00:00.000Z";

/** Documento sem coordenadas nem disponibilidade: espelha o schema atual. */
const NO_OPERATIONAL_DATA: BeautyOperationalDocument = {
  salon: { id: "salon-1", name: "Studio" } as never,
  professionals: [{ id: "p1" }],
  appointments: [],
  clients: [],
};

function completeDocument(): BeautyOperationalDocument {
  return {
    salon: {
      id: "salon-1",
      capacity: 20,
      radiusKm: BEAUTY_DEFAULT_RADIUS_KM,
      location: { lat: -23.5505, lng: -46.6333 },
    },
    services: [{ id: "manicure", price: 60, durationMinutes: 60 }],
    professionals: [
      {
        id: "p1",
        specialties: ["manicure"],
        availability: [SLOT],
        location: { lat: -23.551, lng: -46.634 },
        weeklyCapacity: 12,
        accepting: true,
        confirmed: true,
      },
      {
        id: "p2",
        specialties: ["manicure"],
        availability: [SLOT],
        location: { lat: -23.552, lng: -46.635 },
        weeklyCapacity: 8,
        accepting: true,
      },
      {
        id: "p3",
        specialties: ["pedicure"],
        availability: [SLOT],
        location: { lat: -23.553, lng: -46.636 },
        weeklyCapacity: 8,
        accepting: true,
      },
    ],
    appointments: [
      {
        id: "ap-1",
        clientId: "c1",
        serviceId: "manicure",
        start: NOW,
        status: "pending",
        overflowFrom: "salon-1",
      },
    ],
    clients: [{ id: "c1", consent: true }],
  };
}

describe("capacity adapter: documents without operational data report a gap", () => {
  it("does not invent capacity when the document has no coordinates", () => {
    const report = adaptCapacities(NO_OPERATIONAL_DATA);
    expect(report.data).toEqual([]);
    expect(report.ready).toBe(false);
    expect(report.gaps.some((gap) => gap.field.includes("location"))).toBe(true);
  });

  it("does not invent requests when the salon has no coordinates", () => {
    const report = adaptRequests(NO_OPERATIONAL_DATA);
    expect(report.data).toEqual([]);
    expect(report.ready).toBe(false);
    expect(report.gaps.map((gap) => gap.field)).toContain("salon.location");
  });

  it("flags the real parser document as not operational", async () => {
    const parsed = JSON.parse(
      JSON.stringify({
        salon: { id: "salon-1", name: "Studio", address: "Rua X, 100" },
        services: [{ id: "manicure", name: "Manicure", durationMinutes: 40, price: 60 }],
        professionals: [{ id: "p1", name: "Ana", specialties: ["manicure"] }],
        appointments: [],
        clients: [{ id: "c1", name: "Bia", consent: true }],
      }),
    );
    const parsedEntities = await beautyParser.parse(Buffer.from(JSON.stringify(parsed)));
    const salon = parsedEntities.entities.find((entity) => entity.type === "salon");

    expect(salon?.metadata.address).toBe("Rua X, 100");
    expect(salon?.metadata.location).toBeUndefined();

    const readiness = assessBeautyCapacity({ document: NO_OPERATIONAL_DATA });
    expect(readiness.operationalReady).toBe(false);
    expect(readiness.blockers.length).toBeGreaterThan(0);
  });

  it("carries the provider confirmation signal when present", () => {
    const report = adaptCapacities(completeDocument());
    const confirmedIds = report.data.filter((entry) => entry.confirmed).map((e) => e.providerId);
    expect(confirmedIds).toEqual(["p1"]);
  });

  it("defaults confirmation to false when the document does not state it", () => {
    const document = completeDocument();
    document.professionals = document.professionals?.map(({ confirmed: _ignored, ...rest }) => rest);
    const report = adaptCapacities(document);
    expect(report.data.every((entry) => entry.confirmed === false)).toBe(true);
  });
});

describe("capacity adapter: maps only what the document states", () => {
  it("adapts professionals that carry the required fields", () => {
    const report = adaptCapacities(completeDocument());
    expect(report.data).toHaveLength(3);
    expect(report.data.map((entry) => entry.providerId)).toEqual(["p1", "p2", "p3"]);
    expect(report.data[0]?.serviceIds).toEqual(["manicure"]);
  });

  it("skips a professional that lacks availability", () => {
    const document = completeDocument();
    document.professionals = [
      { ...document.professionals![0]!, availability: [] },
    ];
    const report = adaptCapacities(document);
    expect(report.data).toEqual([]);
    expect(report.gaps.some((gap) => gap.field.endsWith("availability"))).toBe(true);
  });

  it("defaults the radius instead of hardcoding it", () => {
    const document = completeDocument();
    delete document.salon?.radiusKm;
    const report = adaptCapacities(document);
    expect(report.data[0]?.serviceRadiusKm).toBe(BEAUTY_DEFAULT_RADIUS_KM);
  });
});

describe("capacity adapter: overflow becomes a request only with consent", () => {
  it("adapts an overflow appointment when the client consented", () => {
    const report = adaptRequests(completeDocument());
    expect(report.data).toHaveLength(1);
    expect(report.data[0]?.origin).toBe("referral");
    expect(report.data[0]?.consent).toBe("granted");
  });

  it("blocks the request when consent is missing", () => {
    const document = completeDocument();
    document.clients = [{ id: "c1", consent: false }];
    const report = adaptRequests(document);
    expect(report.data).toEqual([]);
    expect(report.ready).toBe(false);
    expect(report.gaps.some((gap) => gap.field.endsWith("consent"))).toBe(true);
  });

  it("ignores appointments that are not overflow", () => {
    const document = completeDocument();
    document.appointments = [
      { id: "ap-2", clientId: "c1", serviceId: "manicure", start: NOW, status: "pending" },
    ];
    const report = adaptRequests(document);
    expect(report.data).toEqual([]);
  });
});

describe("beauty criteria: domain rules live in the plugin", () => {
  it("declares the beauty scope", () => {
    expect(beautyCapacityCriteria.scope).toBe(BEAUTY_SCOPE);
    expect(beautyCapacityCriteria.label).toBe("Beleza");
  });

  it("describes the rules in plain text for the reactor", () => {
    const text = describeBeautyCapacity();
    expect(text).toContain("Consentimento");
    expect(text).toContain("especialidade");
  });

  it("adds beauty criteria on top of the generic set", () => {
    const ids = beautyCriteria().map((criterion) => criterion.id);
    expect(ids).toContain("beauty-specialty");
    expect(ids).toContain("beauty-radius");
    expect(ids).toContain("service-match");
  });

  it("caps the radius at the documented maximum", () => {
    const radius = beautyCriteria().find((criterion) => criterion.id === "beauty-radius");
    const outcome = radius?.evaluate({
      request: {
        id: "r",
        origin: "referral",
        requesterId: "a",
        serviceId: "manicure",
        location: { lat: 0, lng: 0 },
        radiusKm: 50,
        window: { start: NOW, end: NOW },
        urgency: "normal",
        consent: "granted",
        createdAt: NOW,
        expiresAt: NOW,
      },
      capacity: {
        providerId: "p",
        serviceIds: ["manicure"],
        location: { lat: 0, lng: 0 },
        serviceRadiusKm: 50,
        windows: [],
        weeklyCapacity: 1,
        accepting: true,
        confirmed: true,
        updatedAt: NOW,
      },
      distanceKm: BEAUTY_MAX_RADIUS_KM + 1,
    });
    expect(outcome?.passed).toBe(false);
  });
});

describe("readiness: regional fallback works without coordinates", () => {
  function regionalDocument(): BeautyOperationalDocument {
    return {
      salon: { id: "salon-1", neighborhood: "Vila Nova York", city: "Sao Paulo", state: "SP" },
      services: [{ id: "manicure", price: 60, durationMinutes: 60 }],
      professionals: [
        {
          id: "p1",
          specialties: ["manicure"],
          availability: [SLOT],
          neighborhood: "Vila Nova York",
          city: "Sao Paulo",
          state: "SP",
          weeklyCapacity: 10,
          accepting: true,
          confirmed: true,
        },
      ],
      appointments: [
        {
          id: "ap-1",
          clientId: "c1",
          serviceId: "manicure",
          start: NOW,
          status: "pending",
          overflowFrom: "salon-1",
        },
      ],
      clients: [{ id: "c1", consent: true }],
    };
  }

  it("is operational with only a declared neighborhood", () => {
    const readiness = assessBeautyCapacity({ document: regionalDocument() });
    expect(readiness.operationalReady).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });

  it("separates the four readiness levels instead of collapsing them", () => {
    const readiness = assessBeautyCapacity({ document: regionalDocument() });
    // Os dados bastam para rodar...
    expect(readiness.operationalReady).toBe(true);
    // ...e para comparar regiao...
    expect(readiness.regionalCapable).toBe(true);
    // ...mas nao para aplicar raio.
    expect(readiness.geographicallyVerifiable).toBe(false);
    // E o gate geodesico permanece fechado.
    expect(readiness.readiness.status).toBe("not-ready");
  });

  it("counts the provider as regional, not geographic", () => {
    const readiness = assessBeautyCapacity({ document: regionalDocument() });
    expect(readiness.network.providersRegionalOnly).toBe(1);
    expect(readiness.network.providersWithCoordinates).toBe(0);
  });

  it("never turns a regional provider into a matchable count", () => {
    const readiness = assessBeautyCapacity({ document: regionalDocument() });
    expect(readiness.metrics.matchableCount).toBe(0);
    expect(readiness.metrics.completedCount).toBe(0);
  });

  it("records the regional limitation as a non-blocking gap", () => {
    const readiness = assessBeautyCapacity({ document: regionalDocument() });
    expect(readiness.requestGaps.some((gap) => gap.reason.includes("Somente regiao"))).toBe(true);
    expect(readiness.requestGaps.filter((gap) => gap.reason.includes("Somente regiao")).every((gap) => !gap.blocking)).toBe(true);
  });
});

describe("readiness: acceptance is never presumed", () => {
  it("produces no matches when no professional declared acceptance", () => {
    const document = completeDocument();
    document.professionals = document.professionals?.map((p) => ({ ...p, accepting: false }));
    const readiness = assessBeautyCapacity({ document });
    expect(readiness.metrics.matchableCount).toBe(0);
  });
});

describe("readiness: the pilot gate reflects reality", () => {
  it("is not ready with a single provider and no recorded requests", () => {
    const readiness = assessBeautyCapacity({ document: completeDocument() });
    expect(readiness.readiness.status).not.toBe("radar-eligible");
  });

  it("counts providers of the requested service only", () => {
    const readiness = assessBeautyCapacity({ document: completeDocument() });
    expect(readiness.network.compatibleProviders).toBe(2);
    expect(readiness.network.verticalScope).toBe(BEAUTY_SCOPE);
  });

  it("keeps the theoretical ceiling separate from real matches", () => {
    const readiness = assessBeautyCapacity({ document: completeDocument() });
    expect(readiness.metrics.potentialRecoverable).toBeGreaterThanOrEqual(
      readiness.metrics.completedCount,
    );
  });

  it("never reports completions above matches", () => {
    const readiness = assessBeautyCapacity({ document: completeDocument() });
    expect(readiness.metrics.completedCount).toBeLessThanOrEqual(
      readiness.metrics.matchableCount,
    );
  });
});
