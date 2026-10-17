import { MemoryStore, MemoryEnvelope } from "@hub/ai-memory";
import { GiantEntry, enrichContentData, getReusablePatterns } from "@hub/giants";
import { ContentForge, ContentTemplate, ContentData, GeneratedContent } from "./types";

function renderTokens(template: string, data: ContentData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    if (Array.isArray(value)) return value.map((item) => `- ${item}`).join("\n");
    return String(value ?? "");
  });
}

const TEMPLATES: Record<ContentTemplate, string> = {
  landing: `# {{title}}

{{headline}}

{{subheadline}}

## Proposta de valor
{{valueProps}}

## Chamada para ação
{{cta}}
`,
  report: `# Relatório: {{title}}

- Status: {{status}}
- Taxa de falha: {{failureRate}}
- Achados: {{findings}}

## Resumo
{{summary}}
`,
  copy: `# Copy: {{title}}

## Headline
{{headline}}

## Body
{{body}}

## CTA
{{cta}}
`,
  faq: `# FAQ: {{title}}

{{items}}
`,
};

function createForge(): ContentForge {
  return {
    renderTemplate(template: ContentTemplate, data: ContentData): string {
      const raw = TEMPLATES[template];
      if (!raw) throw new Error(`Unknown template: ${template}`);
      return renderTokens(raw, data);
    },

    generateLanding(data: ContentData): GeneratedContent {
      const giants = Array.isArray(data.giants) ? (data.giants as GiantEntry[]) : [];
      const enriched = giants.length > 0 ? enrichContentData(data, giants) : data;
      const title = String(enriched.title || "Landing");
      const content = this.renderTemplate("landing", {
        title,
        headline: enriched.headline || "",
        subheadline: enriched.subheadline || "",
        valueProps: Array.isArray(enriched.valueProps) ? enriched.valueProps.map((v) => `- ${v}`).join("\n") : String(enriched.valueProps || ""),
        cta: enriched.cta || "",
      });
      return {
        template: "landing",
        title,
        content,
        tags: ["landing", String(enriched.vertical || "generic")],
        giantPatterns: giants.length > 0 ? getReusablePatterns(giants) : undefined,
      };
    },

    generateReport(data: ContentData): GeneratedContent {
      const giants = Array.isArray(data.giants) ? (data.giants as GiantEntry[]) : [];
      const enriched = giants.length > 0 ? enrichContentData(data, giants) : data;
      const title = String(enriched.title || "Report");
      const content = this.renderTemplate("report", {
        title,
        status: enriched.status || "unknown",
        failureRate: enriched.failureRate ?? "n/a",
        findings: enriched.findings ?? 0,
        summary: enriched.summary || "",
      });
      return {
        template: "report",
        title,
        content,
        tags: ["report", String(enriched.vertical || "generic")],
        giantPatterns: giants.length > 0 ? getReusablePatterns(giants) : undefined,
      };
    },

    savePage(store: MemoryStore, page: string, title: string, content: string, tags: string[] = [], authorId = "contentforge"): MemoryEnvelope {
      return store.putPage({
        page,
        title,
        content,
        tags,
        author: { id: authorId, kind: "system" },
        provenance: "contentforge",
      });
    },

    recallOrGenerate(store: MemoryStore, page: string, generator: () => GeneratedContent): MemoryEnvelope {
      const existing = store.getPage(page);
      if (existing) return existing;
      const generated = generator();
      return this.savePage(store, page, generated.title, generated.content, generated.tags);
    },
  };
}

export const contentForge = createForge();
export { createForge };
