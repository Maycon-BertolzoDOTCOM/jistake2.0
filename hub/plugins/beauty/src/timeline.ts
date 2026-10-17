import {
  TimelineProviderContribution,
  Entity,
  TimelineBlock,
  ValidationResult,
  ValidationError,
} from "@hub/reactor-config";

const FLOW_ORDER = ["agendamento", "confirmacao", "atendimento", "pagamento", "followup", "overflow"];

export class BeautyTimeline implements TimelineProviderContribution {
  async getBlocks(entities: Entity[]): Promise<TimelineBlock[]> {
    const blocks: TimelineBlock[] = [];

    for (const entity of entities) {
      if (entity.type === "appointment") {
        const status = String(entity.metadata.status || "pending");
        const order = this.getStatusOrder(status);

        blocks.push({
          id: `block-${entity.id}`,
          entityId: entity.id,
          order,
          x: order * 220,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "appointment",
            status,
            stage: this.getStage(status),
            clientId: entity.metadata.clientId,
            serviceId: entity.metadata.serviceId,
            professionalId: entity.metadata.professionalId,
            overflowFrom: entity.metadata.overflowFrom,
          },
        });
      } else if (entity.type === "service") {
        blocks.push({
          id: `block-${entity.id}`,
          entityId: entity.id,
          order: 0,
          x: 0,
          y: 50,
          width: 200,
          height: 120,
          metadata: {
            entityType: "service",
            stage: "catalogo",
            price: entity.metadata.price,
            durationMinutes: entity.metadata.durationMinutes,
          },
        });
      }
    }

    return blocks.sort((a, b) => a.order - b.order);
  }

  private getStatusOrder(status: string): number {
    const map: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      completed: 2,
      cancelled: 3,
      "no-show": 4,
    };
    return map[status] ?? 999;
  }

  private getStage(status: string): string {
    const map: Record<string, string> = {
      pending: "agendamento",
      confirmed: "confirmacao",
      completed: "atendimento",
      cancelled: "cancelamento",
      "no-show": "no-show",
    };
    return map[status] || "outro";
  }

  reorder(blocks: TimelineBlock[], fromIndex: number, toIndex: number): TimelineBlock[] {
    const result = [...blocks];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result.map((block, index) => ({ ...block, order: index }));
  }

  toXml(blocks: TimelineBlock[], entities: Entity[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += "<BeautyPipeline>\n";

    for (const block of blocks.sort((a, b) => a.order - b.order)) {
      if (block.metadata?.entityType === "appointment") {
        xml += `  <Appointment id="${block.entityId}" status="${block.metadata?.status}" stage="${block.metadata?.stage}" client="${block.metadata?.clientId}" service="${block.metadata?.serviceId}" />\n`;
      } else if (block.metadata?.entityType === "service") {
        xml += `  <Service id="${block.entityId}" price="${block.metadata?.price}" duration="${block.metadata?.durationMinutes}" />\n`;
      }
    }

    xml += "</BeautyPipeline>";
    return xml;
  }

  validate(blocks: TimelineBlock[], entities: Entity[]): ValidationResult {
    const errors: ValidationError[] = [];

    const hasAppointment = blocks.some((b) => b.metadata?.entityType === "appointment");
    if (!hasAppointment && blocks.length > 0) {
      errors.push({
        blockId: "agenda",
        message: "Fluxo sem agendamento identificado",
        severity: "warning",
      });
    }

    const noShows = blocks.filter((b) => b.metadata?.status === "no-show");
    if (noShows.length > 0) {
      errors.push({
        blockId: "agenda",
        message: `${noShows.length} no-show(s) detectado(s)`,
        severity: "warning",
      });
    }

    const overflows = blocks.filter((b) => b.metadata?.overflowFrom);
    if (overflows.length > 0) {
      errors.push({
        blockId: "agenda",
        message: `${overflows.length} overflow(s) de parceiro`,
        severity: "warning",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
    };
  }
}

export const beautyTimeline = new BeautyTimeline();
