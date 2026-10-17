import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLOBAL_SHORTCUTS, matchShortcut } from "@hub/command-palette";

const manifest = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")) as {
  main: string;
  types: string;
  exports: Record<string, { types: string; default: string }>;
};

const declaredTargets = [
  manifest.main,
  manifest.types,
  manifest.exports["."]!.default,
  manifest.exports["."]!.types,
];

function sourceFor(distPath: string): string {
  const relative = distPath
    .replace(/^\.\//, "")
    .replace(/^dist\//, "src/")
    .replace(/\.d\.ts$/, ".ts")
    .replace(/\.js$/, ".ts");
  return join(__dirname, relative);
}

/** CJS interop adds a `default` key; it is not part of the authored API. */
function publicExports(module: object): string[] {
  return Object.keys(module)
    .filter((name) => name !== "default")
    .sort();
}

describe("command-palette: declared entrypoints are real", () => {
  it("main, types and the root export all point at the same barrel", () => {
    const barrel = join(__dirname, "src", "index.ts");
    expect(sourceFor(manifest.main)).toBe(barrel);
    expect(sourceFor(manifest.types)).toBe(barrel);
    expect(sourceFor(manifest.exports["."]!.default)).toBe(barrel);
    expect(sourceFor(manifest.exports["."]!.types)).toBe(barrel);
  });

  it("has a source module behind every declared target", () => {
    for (const target of declaredTargets) {
      expect(`${target}: ${existsSync(sourceFor(target))}`).toBe(`${target}: true`);
    }
  });

  it("emits the declared files on build", () => {
    for (const relative of [manifest.main, manifest.types]) {
      expect(`${relative}: ${existsSync(join(__dirname, relative))}`).toBe(`${relative}: true`);
    }
  });
});

describe("command-palette: public API is reachable by package name", () => {
  it("exposes the shortcut registry and matcher", () => {
    expect(typeof GLOBAL_SHORTCUTS).toBe("object");
    expect(typeof matchShortcut).toBe("function");
  });

  it("resolves the built entrypoint by its package name", async () => {
    const module = await import("@hub/command-palette");
    expect(typeof module.matchShortcut).toBe("function");
  });

  it("behaves correctly through the barrel", () => {
    expect(matchShortcut(["g", "o"])).toBe("g,o");
    expect(matchShortcut(["g", "z"])).toBeNull();
    expect(GLOBAL_SHORTCUTS.v).toBe("Trocar Vertical");
  });
});

describe("command-palette: the barrel keeps internals private", () => {
  it("does not re-export the styling helper", async () => {
    const module = await import("@hub/command-palette");
    expect(Object.keys(module)).not.toContain("cn");
  });

  it("does not re-export React components or hooks", async () => {
    const module = await import("@hub/command-palette");
    expect(publicExports(module)).toEqual(["GLOBAL_SHORTCUTS", "matchShortcut"]);
  });

  it("only reaches into the domain types module", () => {
    const barrel = readFileSync(join(__dirname, "src", "index.ts"), "utf8");
    expect(barrel).toContain('from "./types"');
    expect(barrel).not.toMatch(/from\s+["']\.\/CommandPalette["']/);
    expect(barrel).not.toMatch(/from\s+["']\.\/useCommandPalette["']/);
    expect(barrel).not.toMatch(/lib\/utils/);
  });
});
