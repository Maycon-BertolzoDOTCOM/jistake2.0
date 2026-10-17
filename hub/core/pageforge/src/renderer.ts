import { renderVisual, VISUAL_INIT_SCRIPT, getAdapterConfig } from "@hub/visualforge";
import { hydrationScript } from "./hydration";
import { CONSTRUCTS } from "./constructs";
import { PageSchema, ValidationResult } from "./types";

function validatePage(schema: PageSchema): ValidationResult {
  const errors: string[] = [];

  if (!schema.id) errors.push("id is required");
  if (!schema.title) errors.push("title is required");
  if (!schema.theme) errors.push("theme is required");
  if (!Array.isArray(schema.sections)) errors.push("sections must be an array");

  for (const section of schema.sections || []) {
    if (!section.id) errors.push("section id is required");
    if (!Array.isArray(section.constructs)) {
      errors.push(`section ${section.id} constructs must be an array`);
      continue;
    }
    for (const construct of section.constructs) {
      const definition = CONSTRUCTS[construct.type];
      if (!definition) {
        errors.push(`unknown construct: ${construct.type}`);
        continue;
      }
      for (const field of definition.required) {
        if (construct.props?.[field] === undefined || construct.props?.[field] === null || construct.props?.[field] === "") {
          errors.push(`construct ${construct.id} missing required field: ${field}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function renderConstruct(construct: { id: string; type: keyof typeof CONSTRUCTS; props: Record<string, unknown>; visual?: { adapter: string; props?: Record<string, unknown> } }): string {
  const definition = CONSTRUCTS[construct.type];
  if (!definition) return `<!-- unknown construct: ${construct.type} -->`;
  const base = definition.render(construct.props || {});
  if (!construct.visual) return base;
  const visual = renderVisual(construct.visual.adapter as Parameters<typeof renderVisual>[0], construct.visual.props || {});
  return `${base}
${visual.fallbackHtml}`;
}


export function validatePerfBudget(schema: PageSchema, html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const maxHtmlKb = schema.perfBudget?.maxHtmlKb;
  if (maxHtmlKb) {
    const sizeKb = Buffer.byteLength(html, "utf8") / 1024;
    if (sizeKb > maxHtmlKb) {
      errors.push(`html size ${sizeKb.toFixed(1)}KB exceeds budget ${maxHtmlKb}KB`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderPage(schema: PageSchema): string {
  const validation = validatePage(schema);
  if (!validation.valid) {
    throw new Error(`Invalid page schema: ${validation.errors.join("; ")}`);
  }

  const usedAdapters = new Set<string>();
  for (const section of schema.sections || []) {
    for (const construct of section.constructs || []) {
      if (construct.visual?.adapter) usedAdapters.add(construct.visual.adapter);
    }
  }

  const sections = schema.sections
    .map((section) => `<section id="${section.id}">${section.constructs.map(renderConstruct).join("\n")}</section>`)
    .join("\n");

  const css = `
:root {
  --color-primary: ${schema.theme.colors.primary || "#0f172a"};
  --color-accent: ${schema.theme.colors.accent || "#22c55e"};
  --font-family: ${schema.theme.font || "system-ui, sans-serif"};
  --radius: ${schema.theme.radius || "1rem"};
  --spacing: ${schema.theme.spacing || "1rem"};
}
body { font-family: var(--font-family); margin: 0; background: linear-gradient(180deg, #0b1120, #111827 70%); color: #e5e7eb; }
main { max-width: 1100px; margin-inline: auto; }
section { position: relative; isolation: isolate; padding: 3rem 1rem; }
.hero { padding: 4rem 2rem; text-align: center; }
.hero h1 { font-size: clamp(2.2rem, 5vw, 4rem); line-height: 1.1; }
[data-visual-adapter] {
  position: absolute;
  inset: -8% 50% auto 50%;
  width: 14rem;
  height: 14rem;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), var(--color-accent));
  filter: blur(0.8rem);
  z-index: -1;
  opacity: .7;
  transform: translateX(-50%) scale(1);
  animation: pulse 9s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pulse { 0%,100% { transform: translateX(-50%) scale(1); opacity:.7 } 50% { transform: translateX(-50%) scale(1.2); opacity:.85 } }
.cta a, .booking-cta a { display: inline-block; padding: 0.75rem 1.25rem; border-radius: var(--radius); background: var(--color-accent); color: #fff; text-decoration: none; }
.skip-link { position: absolute; left: -9999px; top: 0; }
.skip-link:focus { left: 1rem; top: 1rem; z-index: 100; background: #000; color: #fff; padding: 0.5rem 1rem; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${schema.seo?.title || schema.title}</title>
  ${schema.seo?.description ? `<meta name="description" content="${schema.seo.description}" />` : ""}
  <style>${css}</style>
</head>
<body>
  ${schema.accessibility?.skipLink === false ? "" : '<a class="skip-link" href="#main-content">Pular para conteúdo principal</a>'}
  <main id="main-content" role="${schema.accessibility?.landmarkRoles === false ? "presentation" : "main"}">
    ${sections}
    ${schema.giantInsights && schema.giantInsights.length ? `<aside class="giant-insights"><h2>Reusable giant patterns</h2><ul>${schema.giantInsights.map((insight) => `<li>${insight}</li>`).join("")}</ul></aside>` : ""}
  </main>
  ${Array.from(usedAdapters).map((adapter) => {
    const config = getAdapterConfig(adapter as Parameters<typeof getAdapterConfig>[0]);
    return config?.cdnUrl ? `<script src="${config.cdnUrl}"></script>` : "";
  }).join("\n")}
  <script>${hydrationScript}</script>
  <script>${VISUAL_INIT_SCRIPT}</script>
  <script>
    if (window.gsap) {
      document.querySelectorAll("[data-visual-adapter='gsap']").forEach((node) => {
        window.gsap.from(node, { opacity: 0, y: 24, duration: 0.9, ease: "power2.out" });
      });
    }
  </script>
</body>
</html>`;
  const perf = validatePerfBudget(schema, html);
  if (!perf.valid) {
    throw new Error(`Performance budget exceeded: ${perf.errors.join("; ")}`);
  }
  return html;
}

export { validatePage };
