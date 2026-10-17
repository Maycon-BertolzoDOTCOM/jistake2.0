import { describe, expect, it } from "vitest";
import { buildBundle, createDeployPlan, hashContent, validateManifest } from "./src/index";

describe("buildforge: manifest", () => {
  it("validates required fields", () => {
    const result = validateManifest({ name: "", version: "", target: "static", assets: [] });
    expect(result.valid).toBe(false);
  });

  it("builds bundle with hashes", () => {
    const result = buildBundle({
      name: "demo",
      version: "1.0.0",
      target: "static",
      assets: [{ path: "index.html", content: "<h1>hi</h1>" }],
    });
    expect(result.valid).toBe(true);
    expect(result.assets[0].hash).toBe(hashContent("<h1>hi</h1>"));
  });
});

describe("buildforge: deploy", () => {
  it("creates deploy plan", () => {
    const plan = createDeployPlan(
      { name: "demo", version: "1.0.0", target: "static", assets: [{ path: "index.html", content: "x" }] },
      { provider: "object-storage", bucket: "hub" },
    );
    expect(plan.valid).toBe(true);
    expect(plan.commands[0]).toContain("upload");
  });
});
