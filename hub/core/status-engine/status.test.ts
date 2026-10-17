import { describe, expect, it } from "vitest";
import { createStatusCheck, daysUntilExpiry, severity, statusFromDaysUntilExpiry } from "./src/index";

describe("status-engine: severity", () => {
  it("maps known levels", () => {
    expect(severity("ok")).toBe(0);
    expect(severity("warning")).toBe(1);
    expect(severity("critical")).toBe(2);
    expect(severity("foo" as never)).toBe(3);
  });
});

describe("status-engine: statusFromDaysUntilExpiry", () => {
  it("returns critical for past", () => {
    expect(statusFromDaysUntilExpiry(-1)).toBe("critical");
  });
  it("returns warning for <=30 days", () => {
    expect(statusFromDaysUntilExpiry(0)).toBe("warning");
    expect(statusFromDaysUntilExpiry(30)).toBe("warning");
  });
  it("returns ok for >30 days", () => {
    expect(statusFromDaysUntilExpiry(31)).toBe("ok");
  });
});

describe("status-engine: daysUntilExpiry", () => {
  it("returns ceiling days for future date", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(daysUntilExpiry(future)).toBe(5);
  });
});

describe("status-engine: createStatusCheck", () => {
  it("creates well-formed check", () => {
    const c = createStatusCheck("id1", "ok", "msg", new Date(), { label: "Test" });
    expect(c.entityId).toBe("id1");
    expect(c.level).toBe("ok");
    expect(c.metadata?.label).toBe("Test");
  });
});
