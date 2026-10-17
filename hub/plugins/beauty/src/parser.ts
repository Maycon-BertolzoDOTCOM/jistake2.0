import { EntityParserContribution, ParsedEntity, SanitizedResult, Entity } from "@hub/reactor-config";

interface BeautyDocument {
  salon?: {
    id: string;
    name: string;
    address?: string;
    capacity?: number;
    radiusKm?: number;
  };
  services?: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  }>;
  professionals?: Array<{
    id: string;
    name: string;
    specialties?: string[];
    availability?: string[];
  }>;
  appointments?: Array<{
    id: string;
    clientId: string;
    serviceId: string;
    professionalId?: string;
    start: string;
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
    overflowFrom?: string;
  }>;
  clients?: Array<{
    id: string;
    name: string;
    phone?: string;
    consent?: boolean;
  }>;
  inventory?: Array<{
    id: string;
    item: string;
    quantity: number;
    minQuantity: number;
  }>;
}

export class BeautyParser implements EntityParserContribution {
  canParse(file: Buffer, mime: string): boolean {
    if (mime === "application/json" || mime === "text/json") {
      try {
        const parsed = JSON.parse(file.toString("utf-8"));
        return !!parsed && typeof parsed === "object" && ("salon" in parsed || "appointments" in parsed || "services" in parsed);
      } catch {
        return false;
      }
    }
    return false;
  }

  async parse(file: Buffer): Promise<ParsedEntity> {
    const doc = JSON.parse(file.toString("utf-8")) as BeautyDocument;
    const entities: Entity[] = [];

    if (doc.salon) {
      entities.push({
        id: doc.salon.id,
        label: doc.salon.name,
        metadata: {
          type: "salon",
          address: doc.salon.address,
          capacity: doc.salon.capacity || 0,
          radiusKm: doc.salon.radiusKm || 5,
        },
        type: "salon",
      });
    }

    for (const service of doc.services || []) {
      entities.push({
        id: service.id,
        label: service.name,
        metadata: {
          type: "service",
          durationMinutes: service.durationMinutes,
          price: service.price,
        },
        type: "service",
      });
    }

    for (const professional of doc.professionals || []) {
      entities.push({
        id: professional.id,
        label: professional.name,
        metadata: {
          type: "professional",
          specialties: professional.specialties || [],
          availability: professional.availability || [],
        },
        type: "professional",
      });
    }

    for (const appointment of doc.appointments || []) {
      entities.push({
        id: appointment.id,
        label: `Agendamento ${appointment.id}`,
        metadata: {
          type: "appointment",
          clientId: appointment.clientId,
          serviceId: appointment.serviceId,
          professionalId: appointment.professionalId,
          start: appointment.start,
          status: appointment.status,
          overflowFrom: appointment.overflowFrom,
        },
        type: "appointment",
      });
    }

    for (const client of doc.clients || []) {
      entities.push({
        id: client.id,
        label: client.name,
        metadata: {
          type: "client",
          phone: client.phone,
          consent: client.consent || false,
        },
        type: "client",
      });
    }

    for (const item of doc.inventory || []) {
      entities.push({
        id: item.id,
        label: item.item,
        metadata: {
          type: "inventory",
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          lowStock: item.quantity <= item.minQuantity,
        },
        type: "inventory",
      });
    }

    return {
      entities,
      metadata: {
        total: entities.length,
        source: "beauty-json",
        parsedAt: new Date().toISOString(),
      },
    };
  }

  sanitize(file: Buffer): SanitizedResult {
    const content = file.toString("utf-8");
    const removed: string[] = [];
    let sanitized = content;

    sanitized = sanitized.replace(/"phone"\s*:\s*"[^"]*"/g, (match) => {
      removed.push("Telefone removido");
      return '"phone": "[REDACTED]"';
    });

    sanitized = sanitized.replace(/"name"\s*:\s*"[^"]*"/g, (match) => {
      removed.push("Nome removido");
      return '"name": "[REDACTED]"';
    });

    return {
      safe: true,
      sanitized: Buffer.from(sanitized, "utf-8"),
      removed,
    };
  }
}

export const beautyParser = new BeautyParser();
