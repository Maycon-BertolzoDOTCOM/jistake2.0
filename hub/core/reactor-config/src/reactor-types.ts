export interface ExtensionPoint<T> {
  id: string;
  name: string;
  description: string;
  type: "single" | "multiple";
}

export interface Extension<T = Record<string, unknown>> {
  id: string;
  name: string;
  version: string;
  contributes?: Partial<T>;
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
}

export class Reactor<T extends Record<string, unknown>> {
  private extensions: Map<string, Extension<T>> = new Map();
  private extensionPoints: ExtensionPoint<T[keyof T]>[];

  constructor(config: {
    extensionPoints: ExtensionPoint<T[keyof T]>[];
    allowedOrigins?: string[];
    federation?: { enabled: boolean; registry: string };
  }) {
    this.extensionPoints = config.extensionPoints;
  }

  async loadExtension(path: string): Promise<void> {
    console.log(`[Reactor] Loading extension from ${path}`);
  }

  getExtension(id: string): Extension<T> | undefined {
    return this.extensions.get(id);
  }

  getExtensions(): Extension<T>[] {
    return Array.from(this.extensions.values());
  }

  getExtensionPoint(id: string): ExtensionPoint<T[keyof T]> | undefined {
    return this.extensionPoints.find((ep) => ep.id === id);
  }
}