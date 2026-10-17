export type VisualAdapterName = "three" | "gsap" | "rive" | "splat" | "motion";

export type VisualProps = Record<string, unknown>;

export type VisualRenderResult = {
  html: string;
  script?: string;
  fallbackHtml: string;
};

export interface VisualAdapter {
  name: VisualAdapterName;
  supportedConstructs: string[];
  perfBudgetKb: number;
  load(): Promise<boolean>;
  render(props: VisualProps): VisualRenderResult;
}

export type VisualRegistry = Record<VisualAdapterName, VisualAdapter>;

export type VisualConstruct = {
  id: string;
  adapter: VisualAdapterName;
  construct: string;
  props: VisualProps;
};
