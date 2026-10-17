import type { VisualAdapterName, VisualProps } from "@hub/visualforge";
export type ThemeTokens = {
  colors: Record<string, string>;
  font: string;
  radius: string;
  spacing: string;
};

export type DataSource = {
  id: string;
  type: "static" | "memory" | "api";
  value?: unknown;
  query?: string;
};

export type ConstructType =
  | "hero"
  | "proof"
  | "features"
  | "pricing"
  | "faq"
  | "cta"
  | "footer"
  | "gallery"
  | "testimonials"
  | "location"
  | "booking-cta"
  | "tabs"
  | "accordion"
  | "carousel"
  | "form"
  | "modal"
  | "scroll-reveal"
  | "parallax"
  | "animated-counter"
  | "drawer"
  | "tooltip"
  | "nail-showcase"
  | "quiz";

export type ConstructInstance = {
  id: string;
  type: ConstructType;
  props: Record<string, unknown>;
  dataSourceId?: string;
  visual?: {
    adapter: VisualAdapterName;
    props?: VisualProps;
  };
};

export type PageSection = {
  id: string;
  constructs: ConstructInstance[];
};

export type PageSchema = {
  id: string;
  title: string;
  description?: string;
  theme: ThemeTokens;
  dataSources?: DataSource[];
  sections: PageSection[];
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
  };
  accessibility?: {
    skipLink?: boolean;
    landmarkRoles?: boolean;
  };
  perfBudget?: {
    maxHtmlKb?: number;
    maxImageKb?: number;
  };
  giantInsights?: string[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};


export function themeFromNail(color: string): ThemeTokens {
  const accent = color || "#ec4899";
  return {
    colors: {
      primary: "#0f172a",
      accent,
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
    },
    font: "system-ui, sans-serif",
    radius: "1rem",
    spacing: "1rem",
  };
}


export function applyGiantInsights(schema: PageSchema, insights: string[]): PageSchema {
  return { ...schema, giantInsights: insights };
}
