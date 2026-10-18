import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HUB_CAPACITY_EXTENSION_POINT_ID,
  HUB_EXTENSION_POINTS,
  type CapacityCriteriaContribution as ShapeContribution,
  type CapacityCriterionDescriptor as ShapeDescriptor,
} from "@hub/reactor-config";
import type {
  CapacityCriteriaContribution as RealContribution,
  CapacityCriterionDescriptor as RealDescriptor,
  CompatibilityCriterion,
} from "@hub/capacity-engine";

describe("contract: the shape declared in reactor-config stays in sync", () => {
  it("exposes the same property names", () => {
    const shape: readonly (keyof ShapeContribution)[] = ["scope", "label", "describe", "criteria"];
    const real: readonly (keyof RealContribution)[] = ["scope", "label", "describe", "criteria"];
    expect(real).toEqual(shape);
  });

  it("exposes the same criterion descriptor properties", () => {
    const shape: readonly (keyof ShapeDescriptor)[] = ["id", "label", "weight", "evaluate"];
    const real: readonly (keyof RealDescriptor)[] = ["id", "label", "weight", "evaluate"];
    expect(real).toEqual(shape);
  });

  it("accepts a real implementation as the declared shape", () => {
    const real: RealContribution = {
      scope: "contract-test",
      label: "Contract test scope",
      describe: () => "fake scope used only to prove structural compatibility",
      criteria: [
        {
          id: "always",
          label: "Always passes",
          weight: 1,
          evaluate: () => ({ passed: true, reason: "ok" }),
        },
      ],
    };

    const asShape: ShapeContribution = real;
    expect(asShape.criteria).toHaveLength(1);
    expect(asShape.criteria[0]?.evaluate({ request: null, capacity: null, distanceKm: 0 })).toEqual({
      passed: true,
      reason: "ok",
    });
  });

  it("rejects an implementation missing a required property", () => {
    const incomplete = {
      scope: "incomplete",
      label: "Incomplete",
      criteria: [],
    };
    const result = describeContract(incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("describe");
  });
});

describe("contract: reactor-config stays a leaf", () => {
  it("does not depend on capacity-engine", () => {
    expect(dependencyDirection()).toEqual({ "capacity-engine": ["@hub/reactor-config"] });
  });

  it("does not declare capacity-engine as a dependency", () => {
    expect(runtimeDependencies("reactor-config")).toEqual([]);
  });

  it("uses capacity-engine as a dev-only dependency", () => {
    expect(runtimeDependencies("capacity-engine")).toEqual([]);
    expect(Object.keys(devDependencies("capacity-engine"))).toContain("@hub/reactor-config");
  });
});

describe("contract: the extension point is registered", () => {
  it("declares hub.capacity as a multiple contribution point", () => {
    const point = HUB_EXTENSION_POINTS.find((entry) => entry.id === HUB_CAPACITY_EXTENSION_POINT_ID);
    expect(point).toBeDefined();
    expect(point?.type).toBe("multiple");
  });

  it("keeps the five original contribution points intact", () => {
    const ids = HUB_EXTENSION_POINTS.map((entry) => entry.id);
    expect(ids).toEqual([
      "hub.parser",
      "hub.timeline",
      "hub.status",
      "hub.actions",
      "hub.glossary",
      "hub.capacity",
    ]);
  });

  it("gives every contribution point a unique id", () => {
    const ids = HUB_EXTENSION_POINTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("contract: a vertical's criteria remain plain criteria", () => {
  it("treats a hand written criterion as the engine type", () => {
    const criterion: CompatibilityCriterion = {
      id: "scope-check",
      label: "Scope check",
      weight: 1,
      evaluate: () => ({ passed: true, reason: "in scope" }),
    };
    expect(criterion.evaluate({} as never).passed).toBe(true);
  });
});

function manifestOf(pkg: "reactor-config" | "capacity-engine"): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  return JSON.parse(
    readFileSync(join(__dirname, "..", pkg, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
}

function runtimeDependencies(pkg: "reactor-config" | "capacity-engine"): string[] {
  return Object.keys(manifestOf(pkg).dependencies ?? {});
}

function devDependencies(pkg: "reactor-config" | "capacity-engine"): Record<string, string> {
  return manifestOf(pkg).devDependencies ?? {};
}

function dependencyDirection(): Record<string, string[]> {
  const direction: Record<string, string[]> = {};
  for (const pkg of ["reactor-config", "capacity-engine"] as const) {
    const declared = Object.keys({
      ...runtimeDependencies(pkg),
      ...devDependencies(pkg),
    })
      .filter((name) => name.startsWith("@hub/"))
      .map((name) => name.replace("@hub/", "@hub/"));
    if (declared.length > 0) direction[pkg] = declared;
  }
  return direction;
}

function describeContract(candidate: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const required: (keyof ShapeContribution)[] = ["scope", "label", "describe", "criteria"];
  const errors = required.filter((key) => candidate[key] === undefined);
  return { valid: errors.length === 0, errors };
}
