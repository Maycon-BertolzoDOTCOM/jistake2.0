import { VisualAdapter, VisualAdapterName, VisualProps, VisualRenderResult, VisualRegistry } from "./types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type VisualAdapterConfig = {
  name: VisualAdapterName;
  supportedConstructs: string[];
  perfBudgetKb: number;
  cdnUrl?: string;
  globalName?: string;
  initScript?: string;
};

const ADAPTER_CONFIGS: VisualAdapterConfig[] = [
  {
    name: "gsap",
    supportedConstructs: ["hero-motion", "scroll-reveal", "counter", "parallax"],
    perfBudgetKb: 60,
    cdnUrl: "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    globalName: "gsap",
    initScript: `if (window.gsap) { document.querySelectorAll("[data-visual-adapter='gsap']").forEach((node) => { window.gsap.from(node, { opacity: 0, y: 24, duration: 0.9, ease: "power2.out" }); }); }`,
  },
  {
    name: "three",
    supportedConstructs: ["hero-3d", "gallery-3d", "nail-gallery"],
    perfBudgetKb: 180,
    cdnUrl: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
    globalName: "THREE",
    initScript: `if (window.THREE) { document.querySelectorAll("[data-visual-adapter='three']").forEach((node) => { node.setAttribute("data-three-ready", "true"); }); }`,
  },
  {
    name: "rive",
    supportedConstructs: ["icon-morph", "micro-interaction", "nail-badge"],
    perfBudgetKb: 90,
    cdnUrl: "https://unpkg.com/@rive-app/canvas@2.10.3/rive.js",
    globalName: "rive",
    initScript: `if (window.rive) { document.querySelectorAll("[data-visual-adapter='rive']").forEach((node) => { node.setAttribute("data-rive-ready", "true"); }); }`,
  },
  {
    name: "splat",
    supportedConstructs: ["splat-viewer", "nail-splat"],
    perfBudgetKb: 240,
    cdnUrl: "https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.7/build/gaussian-splats-3d.min.js",
    globalName: "GaussianSplats3D",
    initScript: `if (window.GaussianSplats3D) { document.querySelectorAll("[data-visual-adapter='splat']").forEach((node) => { node.setAttribute("data-splat-ready", "true"); }); }`,
  },
  {
    name: "motion",
    supportedConstructs: ["tabs", "carousel", "modal", "drawer"],
    perfBudgetKb: 50,
    cdnUrl: undefined,
    globalName: undefined,
    initScript: `document.querySelectorAll("[data-visual-adapter='motion']").forEach((node) => { node.classList.add("motion-ready"); });`,
  },
];

function createAdapter(config: VisualAdapterConfig): VisualAdapter {
  return {
    name: config.name,
    supportedConstructs: config.supportedConstructs,
    perfBudgetKb: config.perfBudgetKb,
    async load() {
      const globalName = config.globalName;
      if (!globalName) return true;
      const globalScope = globalThis as Record<string, unknown>;
      return typeof globalScope[globalName] !== "undefined";
    },
    render(props: VisualProps): VisualRenderResult {
      const encoded = escapeHtml(JSON.stringify(props || {}));
      const html = `<div class="visual-adapter visual-${config.name}" data-visual-adapter="${config.name}" data-visual-props="${encoded}">${escapeHtml(props.alt || props.label || "Visual content")}</div>`;
      return { html, fallbackHtml: html };
    },
  };
}

export const VISUAL_ADAPTERS: VisualRegistry = ADAPTER_CONFIGS.reduce((acc, config) => {
  acc[config.name] = createAdapter(config);
  return acc;
}, {} as VisualRegistry);

export function getAdapterConfig(name: VisualAdapterName): VisualAdapterConfig | undefined {
  return ADAPTER_CONFIGS.find((config) => config.name === name);
}

export function resolveAdapter(name: VisualAdapterName): VisualAdapter | undefined {
  return VISUAL_ADAPTERS[name];
}

export function renderVisual(name: VisualAdapterName, props: VisualProps): VisualRenderResult {
  const adapter = resolveAdapter(name);
  if (!adapter) {
    const html = `<div class="visual-missing" data-visual-adapter="${name}">Adapter not available</div>`;
    return { html, fallbackHtml: html };
  }
  return adapter.render(props);
}

export function listAdapters(): VisualAdapterName[] {
  return Object.keys(VISUAL_ADAPTERS) as VisualAdapterName[];
}

export const VISUAL_INIT_SCRIPT = ADAPTER_CONFIGS.map((config) => config.initScript).filter(Boolean).join("\n");
