import { describe, expect, it } from "vitest";
import { MITRE_ENGAGE_ACTIVITIES } from "./src/types";

describe("deception: MITRE mapping", () => {
  it("lists all 5 activities", () => {
    expect(Object.keys(MITRE_ENGAGE_ACTIVITIES)).toEqual(
      ["affect", "elicit", "expose", "prepare", "understand"]
    );
  });
  it("each activity has description", () => {
    for (const k of Object.keys(MITRE_ENGAGE_ACTIVITIES)) {
      const v = (MITRE_ENGAGE_ACTIVITIES as Record<string, string>)[k];
      expect(v.length).toBeGreaterThan(10);
    }
  });
});
