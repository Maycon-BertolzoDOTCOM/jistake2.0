import { afterEach, describe, expect, it } from "vitest";
import { beautyActions, getHandoffLog, setHandoffLog, setOperationalDocument } from "./src/actions";
import type { BeautyOperationalDocument } from "./src/capacity";

const NOW = "2026-03-02T09:00:00.000Z";
/** Intervalo com duracao declarada: unica forma que prova agenda livre. */
const SLOT = "2026-03-02T09:00:00.000Z/2026-03-02T12:00:00.000Z";

function completeDocument(): BeautyOperationalDocument {
  return {
    salon: {
      id: "salon-1",
      capacity: 20,
      radiusKm: 5,
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

afterEach(() => {
  setOperationalDocument(null);
  setHandoffLog([]);
});

describe("beauty:overflow no longer claims success without data", () => {
  it("fails honestly when no operational document is loaded", async () => {
    const result = await beautyActions.execute("beauty:overflow", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Capacidade real ainda não observada");
    expect(result.error).toContain("ainda nao foi observada");
  });

  it("fails honestly when the document has no coordinates", async () => {
    setOperationalDocument({ salon: { id: "salon-1" }, professionals: [] });
    const result = await beautyActions.execute("beauty:overflow", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Nenhuma profissional cadastrada");
  });

  it("reports a specific blocker when consent is missing", async () => {
    const document = completeDocument();
    document.clients = [{ id: "c1", consent: false }];
    setOperationalDocument(document);
    const result = await beautyActions.execute("beauty:overflow", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Consentimento");
  });

  it("returns real candidates when the document is complete", async () => {
    setOperationalDocument(completeDocument());
    const result = await beautyActions.execute("beauty:overflow", { radiusKm: 5 });
    expect(result.success).toBe(true);
    const output = result.output as { matchableCount: number; candidates: unknown[] };
    expect(output.matchableCount).toBeGreaterThan(0);
    expect(output.candidates.length).toBeGreaterThan(0);
  });

  it("clamps the radius instead of trusting an arbitrary value", async () => {
    setOperationalDocument(completeDocument());
    const far = await beautyActions.execute("beauty:overflow", { radiusKm: 9999 });
    expect((far.output as { radiusKm: number }).radiusKm).toBe(8);
  });

  it("never reports more matches than the request count", async () => {
    setOperationalDocument(completeDocument());
    const result = await beautyActions.execute("beauty:overflow", {});
    const output = result.output as { matchableCount: number };
    expect(output.matchableCount).toBeLessThanOrEqual(1);
  });
});

describe("beauty:aprovar records a real provider decision", () => {
  it("requires identifiers", async () => {
    const result = await beautyActions.execute("beauty:aprovar", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("obrigatórios");
  });

  it("records an acceptance", async () => {
    const result = await beautyActions.execute("beauty:aprovar", {
      requestId: "ap-1",
      partnerId: "p1",
    });
    expect(result.success).toBe(true);
    const log = getHandoffLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.providerDecision?.decision).toBe("accepted");
    expect(log[0]?.providerDecision?.actor).toBe("provider");
  });

  it("records a refusal", async () => {
    await beautyActions.execute("beauty:aprovar", {
      requestId: "ap-1",
      partnerId: "p1",
      decision: "declined",
    });
    const log = getHandoffLog();
    expect(log[0]?.status).toBe("declined");
    expect(log[0]?.providerDecision?.decision).toBe("declined");
  });

  it("does not double count a repeated decision for the same pair", async () => {
    const params = { requestId: "ap-1", partnerId: "p1" };
    await beautyActions.execute("beauty:aprovar", params);
    await beautyActions.execute("beauty:aprovar", params);
    expect(getHandoffLog()).toHaveLength(1);
  });

  it("keeps different partners as separate handoffs", async () => {
    await beautyActions.execute("beauty:aprovar", { requestId: "ap-1", partnerId: "p1" });
    await beautyActions.execute("beauty:aprovar", { requestId: "ap-1", partnerId: "p2" });
    expect(getHandoffLog()).toHaveLength(2);
  });
});
