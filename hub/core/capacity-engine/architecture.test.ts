import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "src");

interface SourceFile {
  name: string;
  content: string;
}

function sourceFiles(): SourceFile[] {
  return readdirSync(SRC)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({ name, content: readFileSync(join(SRC, name), "utf8") }));
}

const FILES = sourceFiles();

function offenders(pattern: RegExp): string[] {
  return FILES.filter((file) => pattern.test(file.content)).map((file) => file.name);
}

describe("architecture: the core performs no I/O", () => {
  it("has source files to check", () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  it("never imports filesystem, network or database modules", () => {
    const forbidden = /from\s+["'](?:node:)?(?:fs|net|http|https|sqlite|sqlite3|pg|mysql2|child_process)["']/;
    expect(offenders(forbidden)).toEqual([]);
  });

  it("never reads a clock or randomness at import time", () => {
    expect(offenders(/\bDate\.now\(\)/)).toEqual([]);
    expect(offenders(/new Date\(\s*\)/)).toEqual([]);
    expect(offenders(/\bMath\.random\(\)/)).toEqual([]);
  });

  it("never reaches outside the package", () => {
    expect(offenders(/from\s+["']@hub\//)).toEqual([]);
    expect(offenders(/from\s+["']\.\.\/\.\.\//)).toEqual([]);
  });

  it("never imports a presentation schema", () => {
    const presentation = /landing|beauty-landing|pageforge|contentforge|visualforge|PageSchema/i;
    expect(offenders(presentation)).toEqual([]);
  });
});

describe("architecture: the core stays domain agnostic", () => {
  it("contains no vertical vocabulary", () => {
    const vocabulary =
      /\b(?:manicure|manicuri|nail|unha|cabelo|cabeleireir|barbeir|sobrancelha|pet|grooming|eletricist|encanador|beauty|salao|salão)\b/i;
    expect(offenders(vocabulary)).toEqual([]);
  });

  it("contains no hardcoded distance default", () => {
    expect(offenders(/\b\d+\s*km\b/)).toEqual([]);
  });

  it("contains no hardcoded currency amount", () => {
    expect(offenders(/R\$\s*\d/)).toEqual([]);
  });
});

describe("architecture: the package declares no runtime dependency", () => {
  it("ships with an empty dependencies map", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([]);
  });

  it("depends on reactor-config as dev-only, keeping the dependency unidirectional", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
    expect(manifest.dependencies?.["@hub/reactor-config"]).toBeUndefined();
    expect(manifest.devDependencies?.["@hub/reactor-config"]).toBeDefined();
  });
});

describe("architecture: no build artifact leaks into the package root", () => {
  it("emits nothing outside dist/", () => {
    const leaked = readdirSync(__dirname).filter((name) => {
      if (name === "dist" || name === "node_modules" || name === "src") return false;
      return /\.d\.ts$|\.d\.ts\.map$|\.js\.map$/.test(name) || (name.endsWith(".js") && name !== "tsconfig.contract.json");
    });
    expect(leaked).toEqual([]);
  });

  it("keeps the contract assertion outside src so the core stays self-contained", () => {
    const rootFiles = readdirSync(__dirname);
    expect(rootFiles).toContain("contract.ts");
    const srcFiles = readdirSync(SRC);
    expect(srcFiles).not.toContain("contract.ts");
  });
});
