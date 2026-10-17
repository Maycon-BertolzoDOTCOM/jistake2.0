import { SecurityParser, RegistryEntry } from "./parser";
import {
  StatusProviderContribution,
  StatusCheck,
  CertificateInfo,
} from "@hub/reactor-config";
import { securityParser } from "./parser";

export class SecurityStatus implements StatusProviderContribution {
  private parser: SecurityParser;

  constructor(parser: SecurityParser = securityParser) {
    this.parser = parser;
  }

  async check(entityId: string): Promise<StatusCheck> {
    const entry = await this.parser.getGPTById(entityId);
    if (!entry) {
      return {
        entityId,
        level: "unknown",
        message: "GPT não encontrado no registry",
      };
    }

    if (!entry.autorizado) {
      return {
        entityId,
        level: "critical",
        message: "GPT não autorizado para auditoria",
        metadata: { autorizado: false },
      };
    }

    if (entry.gate !== "pre-aprovado") {
      return {
        entityId,
        level: "warning",
        message: "Gate pendente de aprovação",
        metadata: { gate: entry.gate },
      };
    }

    const now = new Date();
    const [start, end] = entry.janela.split("/").map((d) => new Date(d));

    if (now < start) {
      return {
        entityId,
        level: "warning",
        message: `Autorização inicia em ${start.toLocaleDateString("pt-BR")}`,
        expiresAt: start,
        metadata: { janela: entry.janela },
      };
    }

    if (now > end) {
      return {
        entityId,
        level: "critical",
        message: `Autorização expirada em ${end.toLocaleDateString("pt-BR")}`,
        expiresAt: end,
        metadata: { janela: entry.janela, expirado: true },
      };
    }

    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let level: StatusCheck["level"] = "ok";
    let message = "Autorização válida";

    if (daysLeft <= 7) {
      level = "warning";
      message = `Autorização expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`;
    } else if (daysLeft <= 0) {
      level = "critical";
      message = "Autorização expirada";
    }

    return {
      entityId,
      level,
      message,
      expiresAt: end,
      metadata: {
        autorizacao_id: entry.autorizacao_id,
        autorizado_por: entry.autorizado_por,
        janela: entry.janela,
        limites: entry.limites,
        escopo: entry.escopo,
        diasRestantes: daysLeft,
      },
    };
  }

  async checkBatch(entityIds: string[]): Promise<StatusCheck[]> {
    return Promise.all(entityIds.map((id) => this.check(id)));
  }

  async getCertificateInfo(entityId: string): Promise<CertificateInfo | null> {
    const entry = await this.parser.getGPTById(entityId);
    if (!entry) return null;

    const [start, end] = entry.janela.split("/").map((d) => new Date(d));

    return {
      subject: entry.id,
      issuer: entry.autorizado_por,
      notBefore: start,
      notAfter: end,
      serialNumber: entry.autorizacao_id,
      fingerprint: entry.autorizacao_id.replace("sha256:", "").slice(0, 32),
      isRevoked: !entry.autorizado || entry.gate !== "pre-aprovado" || new Date() > end,
    };
  }

  severity(level: string): number {
    const map: Record<string, number> = {
      ok: 0,
      warning: 1,
      critical: 2,
      unknown: 3,
    };
    return map[level] ?? 3;
  }

  async getAllStatus(): Promise<StatusCheck[]> {
    const registry = await this.parser.getRegistry();
    const authorized = registry.gpts.filter((g) => g.autorizado && g.gate === "pre-aprovado");
    return this.checkBatch(authorized.map((g) => g.id));
  }

  getLimitesConhecidos(): string[] {
    return [
      "sem_dos",
      "sem_dados_reais",
      "sem_engenharia_social",
      "sem_persistencia",
      "sem_exfiltracao",
      "apenas_isca",
    ];
  }

  validateLimites(limites: string[]): { valid: boolean; unknown: string[] } {
    const conhecidos = this.getLimitesConhecidos();
    const unknown = limites.filter((l) => !conhecidos.includes(l));
    return { valid: unknown.length === 0, unknown };
  }
}

export const securityStatus = new SecurityStatus();