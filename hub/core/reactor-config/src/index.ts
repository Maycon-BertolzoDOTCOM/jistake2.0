import { Reactor, ExtensionPoint, Extension } from "./reactor-types";
export { Reactor, ExtensionPoint, Extension } from "./reactor-types";

export interface HubContributionPoints {
  "hub.parser": EntityParserContribution;
  "hub.timeline": TimelineProviderContribution;
  "hub.status": StatusProviderContribution;
  "hub.actions": ActionProviderContribution;
  "hub.glossary": GlossaryProviderContribution;
  "hub.capacity": CapacityCriteriaContribution;
  [key: string]: unknown;
}

/**
 * Contrato de capacidade: cada vertical declara como avalia se um prestador
 * pode atender uma solicitacao.
 *
 * Deliberadamente declarado aqui, com forma estrutural minima, e NAO importado
 * de `@hub/capacity-engine`. `reactor-config` e leaf e precisa continuar assim.
 *
 * A duplicacao e vigiada por `capacity-contract.test.ts`, que compara esta forma
 * com a implementacao real. Se um dos lados mudar sem o outro, o build falha.
 */
export interface CapacityCriteriaContribution {
  /** Roteiro logico (ex.: "beauty", "pet-grooming"). */
  scope: string;
  /** Rotulo legivel para UI e glossario. */
  label: string;
  /** Semantica de negocio, em texto. O motor nao a executa. */
  describe(): string;
  /** Um criterio de compatibilidade, conforme definido pelo motor. */
  criteria: CapacityCriterionDescriptor[];
}

/**
 * Forma estrutural de `CompatibilityCriterion` do motor. `evaluate` recebe o
 * contexto `{ request, capacity, distanceKm }` e devolve `{ passed, reason }`.
 */
export interface CapacityCriterionDescriptor {
  id: string;
  label: string;
  weight: number;
  evaluate(context: {
    request: unknown;
    capacity: unknown;
    distanceKm: number | null;
  }): { passed: boolean; reason: string; inconclusive?: boolean };
}

export interface EntityParserContribution {
  canParse(file: Buffer, mime: string): boolean;
  parse(file: Buffer): Promise<ParsedEntity>;
  sanitize(file: Buffer): SanitizedResult;
}

export interface TimelineProviderContribution {
  getBlocks(entities: Entity[]): Promise<TimelineBlock[]>;
  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[];
  toXml(blocks: TimelineBlock[], entities: Entity[]): string;
  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult;
}

export interface StatusProviderContribution {
  check(entityId: string): Promise<StatusCheck>;
  checkBatch(entityIds: string[]): Promise<StatusCheck[]>;
  getCertificateInfo(entityId: string): Promise<CertificateInfo | null>;
  severity(level: string): number;
}

export interface ActionProviderContribution {
  getActions(): CommandAction[];
  execute(actionId: string, params: Record<string, unknown>): Promise<ActionResult>;
}

export interface GlossaryProviderContribution {
  getTerms(): GlossaryTerm[];
  search(query: string): GlossaryTerm[];
}

export interface ParsedEntity {
  entities: Entity[];
  metadata: Record<string, unknown>;
}

export interface SanitizedResult {
  safe: boolean;
  sanitized: Buffer;
  removed: string[];
}

export interface Entity {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  type: string;
}

export interface TimelineBlock {
  id: string;
  entityId: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  blockId: string;
  message: string;
  severity: "error" | "warning";
}

export interface StatusCheck {
  entityId: string;
  level: "ok" | "warning" | "critical" | "unknown";
  message: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  notBefore: Date;
  notAfter: Date;
  serialNumber: string;
  fingerprint: string;
  isRevoked?: boolean;
}

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: string;
  keywords: string[];
  execute: () => Promise<void> | void;
  disabled?: boolean;
}

export interface ActionResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
  related?: string[];
}

export const HUB_EXTENSION_POINTS: ExtensionPoint<HubContributionPoints[keyof HubContributionPoints]>[] = [
  {
    id: "hub.parser",
    name: "Entity Parser",
    description: "Parseia arquivos específicos do domínio em entidades",
    type: "single",
  },
  {
    id: "hub.timeline",
    name: "Timeline Provider",
    description: "Fornece blocos de timeline e tradução para XML original",
    type: "single",
  },
  {
    id: "hub.status",
    name: "Status Provider",
    description: "Verifica validade de certificados/credenciais e produz semáforos",
    type: "single",
  },
  {
    id: "hub.actions",
    name: "Action Provider",
    description: "Ações disponíveis para as entidades do domínio",
    type: "multiple",
  },
  {
    id: "hub.glossary",
    name: "Glossary Provider",
    description: "Glossário de termos do domínio",
    type: "single",
  },
  {
    id: "hub.capacity",
    name: "Capacity Criteria Provider",
    description:
      "Declara os critérios de compatibilidade que definem se um prestador pode atender uma solicitação, sem que o motor conheça o domínio",
    type: "multiple",
  },
];

export const HUB_CAPACITY_EXTENSION_POINT_ID = "hub.capacity" as const;

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  coreVersion: string;
  entityName: string;
  timelineName: string;
  certificateName: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  keywords?: string[];
  engines?: { node: string; python?: string };
  contributions?: Partial<Record<keyof HubContributionPoints, string>>;
}

export function createReactor(): Reactor<HubContributionPoints> {
  const reactor = new Reactor<HubContributionPoints>({
    extensionPoints: HUB_EXTENSION_POINTS,
    allowedOrigins: ["file://", "https://hub.local", "http://localhost:3000"],
    federation: {
      enabled: true,
      registry: "https://registry.hub.local",
    },
  });

  return reactor;
}

export async function loadPlugins(
  reactor: Reactor<HubContributionPoints>,
  pluginPaths: string[]
): Promise<void> {
  for (const path of pluginPaths) {
    try {
      await reactor.loadExtension(path);
    } catch (error) {
      console.error(`Falha ao carregar plugin ${path}:`, error);
    }
  }
}

export function validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest.id || !/^[a-z-]+$/.test(manifest.id)) {
    errors.push("id deve ser lowercase com hífens (ex: hub-security)");
  }

  if (!manifest.name) {
    errors.push("name é obrigatório");
  }

  if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push("version deve seguir SemVer (ex: 1.0.0)");
  }

  if (!manifest.coreVersion) {
    errors.push("coreVersion é obrigatório");
  }

  if (!manifest.entityName) {
    errors.push("entityName é obrigatório");
  }

  if (!manifest.timelineName) {
    errors.push("timelineName é obrigatório");
  }

  if (!manifest.certificateName) {
    errors.push("certificateName é obrigatório");
  }

  return { valid: errors.length === 0, errors };
}