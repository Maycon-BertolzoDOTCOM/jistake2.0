import {
  TimelineProviderContribution,
  Entity,
  TimelineBlock,
  ValidationResult,
  ValidationError,
} from "@hub/reactor-config";
import { securityParser } from "./parser";

const CATEGORY_ORDER = [
  "cat1_direta",
  "cat2_roleplay",
  "cat3_autoridade",
  "cat4_traducao",
  "cat5_hipotetica",
  "cat6_fragmentacao",
  "cat7_multiturno",
  "cat8_output_embedding",
  "cat9_injecao_prompt",
  "cat10_vazamento_dados",
  "cat11_lrl",
  "cat12_encoding",
];

const CATEGORY_LABELS: Record<string, string> = {
  cat1_direta: "Diretamente",
  cat2_roleplay: "Roleplay",
  cat3_autoridade: "Autoridade",
  cat4_traducao: "Tradução",
  cat5_hipotetica: "Hipotética",
  cat6_fragmentacao: "Fragmentação",
  cat7_multiturno: "Multiturno",
  cat8_output_embedding: "Output Embedding",
  cat9_injecao_prompt: "Injeção de Prompt",
  cat10_vazamento_dados: "Vazamento de Dados",
  cat11_lrl: "LRL (Low Resource Language)",
  cat12_encoding: "Encoding",
};

export class SecurityTimeline implements TimelineProviderContribution {
  async getBlocks(entities: Entity[]): Promise<TimelineBlock[]> {
    const blocks: TimelineBlock[] = [];

    for (const entity of entities) {
      const categories = (entity.metadata.categorias as string[]) || [];
      const validCategories = categories.filter((c) => c.startsWith("cat"));

      for (let i = 0; i < validCategories.length; i++) {
        const category = validCategories[i];
        const order = CATEGORY_ORDER.indexOf(category) >= 0
          ? CATEGORY_ORDER.indexOf(category)
          : 999 + i;

        blocks.push({
          id: `block-${entity.id}-${category}`,
          entityId: entity.id,
          order,
          x: order * 220,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "gpt-target",
            category,
            categoryLabel: CATEGORY_LABELS[category] || category,
            gptLink: entity.metadata.link,
            priority: entity.metadata.prioridade,
          },
        });
      }

      if (validCategories.length === 0) {
        blocks.push({
          id: `block-${entity.id}-empty`,
          entityId: entity.id,
          order: 0,
          x: 0,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "gpt-target",
            category: "none",
            categoryLabel: "Sem categorias",
            gptLink: entity.metadata.link,
          },
        });
      }
    }

    return blocks.sort((a, b) => a.order - b.order);
  }

  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[] {
    const result = [...blocks];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result.map((block, index) => ({ ...block, order: index }));
  }

  toXml(blocks: TimelineBlock[], entities: Entity[]): string {
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    const gptGroups = new Map<string, TimelineBlock[]>();
    for (const block of blocks) {
      const group = gptGroups.get(block.entityId) || [];
      group.push(block);
      gptGroups.set(block.entityId, group);
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += "<AuditPipeline>\n";

    for (const [entityId, entityBlocks] of gptGroups) {
      const entity = entityMap.get(entityId);
      if (!entity) continue;

      xml += `  <GPT id="${entityId}" link="${entity.metadata.link}" label="${entity.label}">\n`;

      for (const block of entityBlocks.sort((a, b) => a.order - b.order)) {
        const category = (block.metadata?.category as string) || "";
        const label = (block.metadata?.categoryLabel as string) || "";
        xml += `    <Category id="${category}" label="${label}" order="${block.order}" />\n`;
      }

      xml += "  </GPT>\n";
    }

    xml += "</AuditPipeline>";
    return xml;
  }

  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult {
    const errors: ValidationError[] = [];
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    for (const block of blocks) {
      const entity = entityMap.get(block.entityId);
      if (!entity) {
        errors.push({
          blockId: block.id,
          message: `Entidade ${block.entityId} não encontrada`,
          severity: "error",
        });
        continue;
      }

      const category = (block.metadata?.category as string) || "";
      if (category && category !== "none" && !category.startsWith("cat")) {
        errors.push({
          blockId: block.id,
          message: `Categoria inválida: ${category}`,
          severity: "warning",
        });
      }

      const validCategories = ((entity.metadata.categorias as string[]) || []).filter((c) => c.startsWith("cat"));
      if (category && category !== "none" && !validCategories.includes(category)) {
        errors.push({
          blockId: block.id,
          message: `Categoria ${category} não autorizada para este GPT`,
          severity: "error",
        });
      }
    }

    const gptCounts = new Map<string, number>();
    for (const block of blocks) {
      if (block.metadata?.category && block.metadata?.category !== "none") {
        gptCounts.set(block.entityId, (gptCounts.get(block.entityId) || 0) + 1);
      }
    }

    for (const [entityId, count] of gptCounts) {
      if (count > 12) {
        errors.push({
          blockId: `gpt-${entityId}`,
          message: `Muitas categorias (${count}) para um único GPT. Máximo 12.`,
          severity: "warning",
        });
      }
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
    };
  }
}

export const securityTimeline = new SecurityTimeline();