import {
  StatusProviderContribution,
  StatusCheck,
  CertificateInfo,
} from "@hub/reactor-config";

interface AppointmentRecord {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
  start: string;
  professionalId?: string;
}

interface ProfessionalRecord {
  id: string;
  name: string;
  availability: string[];
  licenseUntil?: string;
}

interface InventoryRecord {
  id: string;
  item: string;
  quantity: number;
  minQuantity: number;
}

export class BeautyStatus implements StatusProviderContribution {
  private appointments = new Map<string, AppointmentRecord>();
  private professionals = new Map<string, ProfessionalRecord>();
  private inventory = new Map<string, InventoryRecord>();

  addAppointment(record: AppointmentRecord): void {
    this.appointments.set(record.id, record);
  }

  addProfessional(record: ProfessionalRecord): void {
    this.professionals.set(record.id, record);
  }

  addInventory(record: InventoryRecord): void {
    this.inventory.set(record.id, record);
  }

  async check(entityId: string): Promise<StatusCheck> {
    const appointment = this.appointments.get(entityId);
    if (appointment) {
      if (appointment.status === "no-show") {
        return { entityId, level: "critical", message: "No-show detectado", metadata: { status: appointment.status } };
      }
      if (appointment.status === "cancelled") {
        return { entityId, level: "warning", message: "Agendamento cancelado", metadata: { status: appointment.status } };
      }
      if (appointment.status === "pending") {
        return { entityId, level: "warning", message: "Agendamento pendente de confirmação", metadata: { status: appointment.status } };
      }
      return { entityId, level: "ok", message: "Agendamento confirmado", metadata: { status: appointment.status } };
    }

    const professional = this.professionals.get(entityId);
    if (professional) {
      if (professional.licenseUntil) {
        const until = new Date(professional.licenseUntil);
        const days = Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 0) return { entityId, level: "critical", message: "Licença expirada", expiresAt: until, metadata: { professional: professional.name } };
        if (days <= 30) return { entityId, level: "warning", message: `Licença expira em ${days} dias`, expiresAt: until, metadata: { professional: professional.name } };
      }
      return { entityId, level: "ok", message: "Profissional disponível", metadata: { professional: professional.name, availability: professional.availability } };
    }

    const item = this.inventory.get(entityId);
    if (item) {
      if (item.quantity <= 0) {
        return { entityId, level: "critical", message: "Estoque esgotado", metadata: { item: item.item, quantity: item.quantity } };
      }
      if (item.quantity <= item.minQuantity) {
        return { entityId, level: "warning", message: "Estoque baixo", metadata: { item: item.item, quantity: item.quantity, minQuantity: item.minQuantity } };
      }
      return { entityId, level: "ok", message: "Estoque adequado", metadata: { item: item.item, quantity: item.quantity } };
    }

    return { entityId, level: "unknown", message: "Entidade não encontrada" };
  }

  async checkBatch(entityIds: string[]): Promise<StatusCheck[]> {
    return Promise.all(entityIds.map((id) => this.check(id)));
  }

  async getCertificateInfo(entityId: string): Promise<CertificateInfo | null> {
    const professional = this.professionals.get(entityId);
    if (!professional || !professional.licenseUntil) return null;
    const until = new Date(professional.licenseUntil);
    return {
      subject: professional.name,
      issuer: "BeautyOps",
      notBefore: new Date(),
      notAfter: until,
      serialNumber: professional.id,
      fingerprint: professional.id.slice(0, 32),
      isRevoked: new Date() > until,
    };
  }

  severity(level: string): number {
    const map: Record<string, number> = { ok: 0, warning: 1, critical: 2, unknown: 3 };
    return map[level] ?? 3;
  }
}

export const beautyStatus = new BeautyStatus();
