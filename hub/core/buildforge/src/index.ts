import { createHash } from "node:crypto";

export type BuildAsset = {
  path: string;
  content: string;
  contentType?: string;
};

export type BuildManifest = {
  name: string;
  version: string;
  target: "static" | "spa" | "worker";
  assets: BuildAsset[];
  budgetKb?: number;
};

export type BuiltAsset = BuildAsset & {
  hash: string;
  sizeBytes: number;
  sizeKb: number;
};

export type BuildResult = {
  name: string;
  version: string;
  target: BuildManifest["target"];
  assets: BuiltAsset[];
  totalBytes: number;
  totalKb: number;
  valid: boolean;
  errors: string[];
};

export type DeployTarget = {
  provider: "object-storage" | "vercel" | "oracle-vm";
  region?: string;
  bucket?: string;
};

export type DeployPlan = {
  target: DeployTarget;
  files: Array<{ path: string; hash: string; sizeBytes: number }>;
  commands: string[];
  valid: boolean;
  errors: string[];
};

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function validateManifest(manifest: BuildManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest.name) errors.push("name is required");
  if (!manifest.version) errors.push("version is required");
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) errors.push("assets must not be empty");

  const seen = new Set<string>();
  for (const asset of manifest.assets || []) {
    if (!asset.path) errors.push("asset path is required");
    if (typeof asset.content !== "string") errors.push(`asset ${asset.path || "<unknown>"} content must be a string`);
    if (seen.has(asset.path)) errors.push(`duplicate asset path: ${asset.path}`);
    seen.add(asset.path);
  }

  return { valid: errors.length === 0, errors };
}

export function buildBundle(manifest: BuildManifest): BuildResult {
  const validation = validateManifest(manifest);
  const assets: BuiltAsset[] = (manifest.assets || []).map((asset) => {
    const hash = hashContent(asset.content);
    const sizeBytes = Buffer.byteLength(asset.content, "utf8");
    return {
      ...asset,
      hash,
      sizeBytes,
      sizeKb: Number((sizeBytes / 1024).toFixed(2)),
    };
  });

  const totalBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const totalKb = Number((totalBytes / 1024).toFixed(2));

  const errors = [...validation.errors];
  if (manifest.budgetKb && totalKb > manifest.budgetKb) {
    errors.push(`bundle size ${totalKb}KB exceeds budget ${manifest.budgetKb}KB`);
  }

  return {
    name: manifest.name,
    version: manifest.version,
    target: manifest.target,
    assets,
    totalBytes,
    totalKb,
    valid: errors.length === 0,
    errors,
  };
}

export function createDeployPlan(manifest: BuildManifest, target: DeployTarget): DeployPlan {
  const build = buildBundle(manifest);
  const files = build.assets.map((asset) => ({
    path: asset.path,
    hash: asset.hash,
    sizeBytes: asset.sizeBytes,
  }));

  const commands: string[] = [];
  if (target.provider === "object-storage") {
    commands.push(`upload ${files.length} files to ${target.bucket || "default-bucket"}`);
  } else if (target.provider === "vercel") {
    commands.push("vercel deploy --prod");
  } else {
    commands.push("rsync -avz dist/ oracle-vm:/var/www/hub/");
  }

  return {
    target,
    files,
    commands,
    valid: build.valid,
    errors: build.errors,
  };
}
