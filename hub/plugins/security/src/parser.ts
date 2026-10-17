import { promises as fs } from "fs";
import { join } from "path";
import * as yaml from "yaml";
import {
  EntityParserContribution,
  ParsedEntity,
  SanitizedResult,
  Entity,
} from "@hub/reactor-config";

const JANUS_REGISTRY_PATH = process.env.JANUS_REGISTRY_PATH || "../../../janus/links/registry.yaml";
const JANUS_CATEGORIES_PATH = process.env.JANUS_CATEGORIES_PATH || "../../../janus/runner/tests";

export interface RegistryEntry {
  id: string;
  link: string;
  descricao: string;
  autorizado: boolean;
  gate: "pre-aprovado" | "pendente";
  prioridade: "alta" | "media" | "baixa";
  categorias: string[];
  autorizacao_id: string;
  autorizado_por: string;
  janela: string;
  limites: string[];
  escopo: string[];
}

interface Registry {
  gpts: RegistryEntry[];
}

interface AttackCategory {
  id: string;
  name: string;
  description: string;
  prompts: string[];
}

export class SecurityParser implements EntityParserContribution {
  private registryCache: Registry | null = null;
  private categoriesCache: Map<string, AttackCategory> = new Map();

  canParse(file: Buffer, mime: string): boolean {
    if (mime === "application/yaml" || mime === "text/yaml") {
      try {
        const content = file.toString("utf-8");
        const parsed = yaml.parse(content);
        return !!parsed.gpts;
      } catch {
        return false;
      }
    }
    return false;
  }

  async parse(file: Buffer): Promise<ParsedEntity> {
    const content = file.toString("utf-8");
    const registry = yaml.parse(content) as Registry;

    const entities: Entity[] = registry.gpts
      .filter((gpt) => gpt.autorizado && gpt.gate === "pre-aprovado" && !gpt.link.includes("PLACEHOLDER"))
      .map((gpt) => ({
        id: gpt.id,
        label: gpt.descricao,
        metadata: {
          link: gpt.link,
          categorias: gpt.categorias,
          prioridade: gpt.prioridade,
          autorizacao_id: gpt.autorizacao_id,
          autorizado_por: gpt.autorizado_por,
          janela: gpt.janela,
          limites: gpt.limites,
          escopo: gpt.escopo,
        },
        type: "gpt-target",
      }));

    return {
      entities,
      metadata: {
        total: entities.length,
        source: "janus-registry",
        parsedAt: new Date().toISOString(),
      },
    };
  }

  sanitize(file: Buffer): SanitizedResult {
    const content = file.toString("utf-8");
    const removed: string[] = [];

    const sanitized = content
      .replace(/link:\s*.*PLACEHOLDER.*/g, (match) => {
        removed.push(match.trim());
        return "link: REDACTED";
      })
      .replace(/autorizacao_id:\s*".*"/g, (match) => {
        removed.push(match.trim());
        return 'autorizacao_id: "REDACTED"';
      });

    return {
      safe: true,
      sanitized: Buffer.from(sanitized, "utf-8"),
      removed,
    };
  }

  async getRegistry(): Promise<Registry> {
    if (this.registryCache) return this.registryCache;

    try {
      const content = await fs.readFile(join(process.cwd(), JANUS_REGISTRY_PATH), "utf-8");
      this.registryCache = yaml.parse(content) as Registry;
      return this.registryCache!;
    } catch (error) {
      console.error("Erro ao ler registry:", error);
      return { gpts: [] };
    }
  }

  async getCategories(): Promise<AttackCategory[]> {
    if (this.categoriesCache.size > 0) {
      return Array.from(this.categoriesCache.values());
    }

    try {
      const files = await fs.readdir(join(process.cwd(), JANUS_CATEGORIES_PATH));
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          const content = await fs.readFile(
            join(process.cwd(), JANUS_CATEGORIES_PATH, file),
            "utf-8"
          );
          const category = yaml.parse(content) as AttackCategory;
          this.categoriesCache.set(category.id, category);
        }
      }
    } catch (error) {
      console.error("Erro ao ler categorias:", error);
    }

    return Array.from(this.categoriesCache.values());
  }

  async getGPTById(id: string): Promise<RegistryEntry | null> {
    const registry = await this.getRegistry();
    return registry.gpts.find((g) => g.id === id) || null;
  }

  isAuthorized(entry: RegistryEntry): boolean {
    const now = new Date();
    const [start, end] = entry.janela.split("/").map((d) => new Date(d));
    return entry.autorizado && entry.gate === "pre-aprovado" && now >= start && now <= end;
  }

  getValidCategories(entry: RegistryEntry): string[] {
    return entry.categorias.filter((cat) => cat.startsWith("cat"));
  }
}

export const securityParser = new SecurityParser();