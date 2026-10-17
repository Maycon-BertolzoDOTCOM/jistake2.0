import { MemoryStore } from "@hub/ai-memory";

export type ContentTemplate = "landing" | "report" | "copy" | "faq";

export type ContentData = Record<string, unknown>;

export type GeneratedContent = {
  template: ContentTemplate;
  title: string;
  content: string;
  tags: string[];
  giantPatterns?: string[];
};

export type ContentForge = {
  renderTemplate(template: ContentTemplate, data: ContentData): string;
  generateLanding(data: ContentData): GeneratedContent;
  generateReport(data: ContentData): GeneratedContent;
  savePage(store: MemoryStore, page: string, title: string, content: string, tags?: string[], authorId?: string): ReturnType<MemoryStore["putPage"]>;
  recallOrGenerate(store: MemoryStore, page: string, generator: () => GeneratedContent): ReturnType<MemoryStore["putPage"]>;
};
