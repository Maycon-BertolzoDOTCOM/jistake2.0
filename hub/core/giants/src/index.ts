export type GiantCategory =
  | "marketing"
  | "crm"
  | "seo"
  | "animation"
  | "memory"
  | "plugin-runtime"
  | "security"
  | "content"
  | "infrastructure";

export type IntegrationDecision = "adopt" | "adapt" | "avoid" | "monitor";

export type GiantEntry = {
  id: string;
  name: string;
  url: string;
  category: GiantCategory;
  license: string;
  strengths: string[];
  weaknesses: string[];
  reusablePatterns: string[];
  integrationDecision: IntegrationDecision;
  couplingPlan?: string;
  notes?: string;
};

export type GiantRegistry = {
  giants: GiantEntry[];
};

export function validateGiant(entry: GiantEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!entry.id) errors.push("id is required");
  if (!entry.name) errors.push("name is required");
  if (!entry.url) errors.push("url is required");
  if (!entry.license) errors.push("license is required");
  if (!Array.isArray(entry.strengths)) errors.push("strengths must be an array");
  if (!Array.isArray(entry.weaknesses)) errors.push("weaknesses must be an array");
  if (!Array.isArray(entry.reusablePatterns)) errors.push("reusablePatterns must be an array");
  return { valid: errors.length === 0, errors };
}

export function canCouple(entry: GiantEntry): boolean {
  const permissive = /mit|apache|bsd|isc|unlicense/i.test(entry.license);
  return permissive && (entry.integrationDecision === "adopt" || entry.integrationDecision === "adapt");
}

export function rankGiants(entries: GiantEntry[], category?: GiantCategory): GiantEntry[] {
  const filtered = category ? entries.filter((entry) => entry.category === category) : entries;
  const priority: Record<IntegrationDecision, number> = { adopt: 0, adapt: 1, monitor: 2, avoid: 3 };
  return [...filtered].sort((a, b) => priority[a.integrationDecision] - priority[b.integrationDecision]);
}

export function compareGiants(entries: GiantEntry[]): Array<{
  id: string;
  name: string;
  category: GiantCategory;
  decision: IntegrationDecision;
  canCouple: boolean;
  topStrength: string;
  topWeakness: string;
}> {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    decision: entry.integrationDecision,
    canCouple: canCouple(entry),
    topStrength: entry.strengths[0] || "n/a",
    topWeakness: entry.weaknesses[0] || "n/a",
  }));
}

export function loadRegistry(input: unknown): GiantRegistry {
  if (!input || typeof input !== "object") return { giants: [] };
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.giants)) return { giants: [] };
  return { giants: record.giants as GiantEntry[] };
}


export function getReusablePatterns(entries: GiantEntry[], category?: GiantCategory): string[] {
  const filtered = category ? entries.filter((entry) => entry.category === category) : entries;
  return [...new Set(filtered.flatMap((entry) => entry.reusablePatterns))];
}

export function suggestConstructs(entries: GiantEntry[]): string[] {
  const constructs = new Set<string>();
  for (const entry of entries) {
    if (entry.category === "marketing" || entry.category === "seo") constructs.add("hero");
    if (entry.category === "marketing" || entry.category === "crm") constructs.add("proof");
    if (entry.category === "seo" || entry.category === "content") constructs.add("faq");
    if (entry.category === "crm" || entry.category === "plugin-runtime") constructs.add("features");
    if (entry.category === "animation" || entry.category === "content") constructs.add("gallery");
    if (entry.category === "memory" || entry.category === "plugin-runtime") constructs.add("testimonials");
  }
  return [...constructs].sort();
}

export function enrichContentData(data: Record<string, unknown>, entries: GiantEntry[]): Record<string, unknown> {
  const patterns = getReusablePatterns(entries);
  const enriched: Record<string, unknown> = { ...data, giantPatterns: patterns };

  if (Array.isArray(data.valueProps)) {
    enriched.valueProps = [...data.valueProps, ...patterns.map((pattern) => `Giant pattern: ${pattern}`)];
  }

  if (typeof data.summary === "string" && patterns.length > 0) {
    enriched.summary = `${data.summary}

Reusable giant patterns: ${patterns.join(", ")}`;
  }

  return enriched;
}
