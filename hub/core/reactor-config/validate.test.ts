import { describe, expect, it } from "vitest";
import { validateManifest } from "./src/index";

describe("reactor-config: validateManifest", () => {
  const valid = {
    id: "hub-x",
    name: "X",
    version: "1.0.0",
    coreVersion: "^1.0.0",
    entityName: "E",
    timelineName: "T",
    certificateName: "C",
  };
  it("accepts complete manifest", () => {
    const r = validateManifest(valid as any);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it("rejects bad id and version and coreVersion", () => {
    const bad = { ...valid, id: "ABC", version: "1", entityName: "X" } as any;
    const r = validateManifest({ ...bad, coreVersion: "", entityName: "" } as any);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
