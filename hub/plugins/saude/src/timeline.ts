import {
  TimelineProviderContribution,
  Entity,
  TimelineBlock,
  ValidationResult,
  ValidationError,
} from "@hub/reactor-config";

const ATENDIMENTO_ORDER = ["triagem", "consulta", "exames", "laudo", "prescricao", "alta"];

export class SaudeTimeline implements TimelineProviderContribution {
  async getBlocks(entities: Entity[]): Promise<TimelineBlock[]> {
    const blocks: TimelineBlock[] = [];

    for (const entity of entities) {
      if (entity.type === "hl7") {
        const messageType = entity.metadata.messageType as string;
        const order = this.getHL7Order(messageType);

        blocks.push({
          id: `block-${entity.id}`,
          entityId: entity.id,
          order,
          x: order * 220,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "hl7-message",
            messageType,
            stage: this.getHL7Stage(messageType),
            sendingFacility: entity.metadata.sendingFacility,
          },
        });
      } else if (entity.type === "patient" || entity.type === "encounter" || entity.type === "observation") {
        const order = this.getFHIROrder(entity.type);

        blocks.push({
          id: `block-${entity.id}`,
          entityId: entity.id,
          order,
          x: order * 220,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: entity.type,
            resourceType: entity.metadata.resourceType,
            stage: this.getFHIRStage(entity.type),
          },
        });
      }
    }

    return blocks.sort((a, b) => a.order - b.order);
  }

  private getHL7Order(messageType: string): number {
    const map: Record<string, number> = {
      ADT_A01: 0,
      ADT_A04: 1,
      ORM_O01: 2,
      ORU_R01: 3,
      MDM_T02: 4,
      DFT_P03: 5,
    };
    return map[messageType] ?? 999;
  }

  private getHL7Stage(messageType: string): string {
    const map: Record<string, string> = {
      ADT_A01: "admissao",
      ADT_A04: "registro",
      ORM_O01: "solicitacao",
      ORU_R01: "resultado",
      MDM_T02: "laudo",
      DFT_P03: "faturamento",
    };
    return map[messageType] || "outro";
  }

  private getFHIROrder(resourceType: string): number {
    const map: Record<string, number> = {
      Patient: 0,
      Encounter: 1,
      ServiceRequest: 2,
      Observation: 3,
      DiagnosticReport: 4,
      MedicationRequest: 5,
      Composition: 6,
    };
    return map[resourceType] ?? 999;
  }

  private getFHIRStage(resourceType: string): string {
    const map: Record<string, string> = {
      Patient: "cadastro",
      Encounter: "atendimento",
      ServiceRequest: "solicitacao",
      Observation: "exame",
      DiagnosticReport: "laudo",
      MedicationRequest: "prescricao",
      Composition: "resumo",
    };
    return map[resourceType] || "outro";
  }

  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[] {
    const result = [...blocks];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result.map((block, index) => ({ ...block, order: index }));
  }

  toXml(blocks: TimelineBlock[], entities: Entity[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += "<Atendimento>\n";

    for (const block of blocks.sort((a, b) => a.order - b.order)) {
      if (block.metadata?.entityType === "hl7-message") {
        xml += `  <MensagemHL7 tipo="${block.metadata?.messageType}" etapa="${block.metadata?.stage}" controle="${block.entityId}" />\n`;
      } else {
        xml += `  <RecursoFHIR tipo="${block.metadata?.resourceType}" etapa="${block.metadata?.stage}" id="${block.entityId}" />\n`;
      }
    }

    xml += "</Atendimento>";
    return xml;
  }

  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult {
    const errors: ValidationError[] = [];

    const hasPatient = blocks.some((b) => b.metadata?.resourceType === "Patient" || (b.metadata?.messageType as string | undefined)?.startsWith?.("ADT"));
    if (!hasPatient && blocks.length > 0) {
      errors.push({
        blockId: "atendimento",
        message: "Atendimento sem paciente identificado (ADT ou Patient)",
        severity: "warning",
      });
    }

    const hasEncounter = blocks.some((b) => b.metadata?.resourceType === "Encounter" || (b.metadata?.messageType as string | undefined)?.startsWith?.("ADT"));
    if (!hasEncounter && blocks.length > 1) {
      errors.push({
        blockId: "atendimento",
        message: "Atendimento sem registro de encontro (Encounter/ADT)",
        severity: "warning",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
    };
  }
}

export const saudeTimeline = new SaudeTimeline();