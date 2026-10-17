import {
  StatusProviderContribution,
  StatusCheck,
  CertificateInfo,
} from "@hub/reactor-config";

interface CertificadoICP {
  subject: string;
  issuer: string;
  notBefore: Date;
  notAfter: Date;
  serialNumber: string;
  tipo: "A1" | "A3";
  cpf?: string;
  cnpj?: string;
  status: "valido" | "revogado" | "expirado";
}

export class SaudeStatus implements StatusProviderContribution {
  private certCache: Map<string, CertificadoICP> = new Map();

  async check(entityId: string): Promise<StatusCheck> {
    const cert = this.certCache.get(entityId);
    if (!cert) {
      return {
        entityId,
        level: "unknown",
        message: "Certificado não encontrado no cache",
      };
    }

    const now = new Date();

    if (cert.status === "revogado") {
      return {
        entityId,
        level: "critical",
        message: "Certificado REVOGADO na ICP-Brasil",
        metadata: { certificado: entityId, status: "revogado" },
      };
    }

    if (now < cert.notBefore) {
      return {
        entityId,
        level: "warning",
        message: `Certificado ainda não válido (inicia ${cert.notBefore.toLocaleDateString("pt-BR")})`,
        expiresAt: cert.notBefore,
        metadata: { certificado: entityId, status: "not_yet_valid" },
      };
    }

    if (now > cert.notAfter) {
      return {
        entityId,
        level: "critical",
        message: `Certificado EXPIRADO em ${cert.notAfter.toLocaleDateString("pt-BR")}`,
        expiresAt: cert.notAfter,
        metadata: { certificado: entityId, status: "expirado" },
      };
    }

    const daysLeft = Math.ceil((cert.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let level: StatusCheck["level"] = "ok";
    let message = `Certificado ${cert.tipo} válido`;

    if (daysLeft <= 30) {
      level = "warning";
      message = `Certificado ${cert.tipo} expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`;
    }

    return {
      entityId,
      level,
      message,
      expiresAt: cert.notAfter,
      metadata: {
        certificado: entityId,
        tipo: cert.tipo,
        cpf: cert.cpf,
        cnpj: cert.cnpj,
        status: "valido",
        diasRestantes: daysLeft,
      },
    };
  }

  async checkBatch(entityIds: string[]): Promise<StatusCheck[]> {
    return Promise.all(entityIds.map((id) => this.check(id)));
  }

  async getCertificateInfo(entityId: string): Promise<CertificateInfo | null> {
    const cert = this.certCache.get(entityId);
    if (!cert) return null;

    return {
      subject: cert.subject,
      issuer: cert.issuer,
      notBefore: cert.notBefore,
      notAfter: cert.notAfter,
      serialNumber: cert.serialNumber,
      fingerprint: cert.serialNumber.slice(0, 32),
      isRevoked: cert.status === "revogado",
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

  addCertificado(cert: CertificadoICP): void {
    this.certCache.set(cert.subject, cert);
  }

  parseCertificadoPEM(pem: string): CertificadoICP | null {
    try {
      const lines = pem.split("\n");
      const base64 = lines.filter((l) => !l.startsWith("---")).join("");
      const der = Buffer.from(base64, "base64");

      return {
        subject: "CN=Exemplo",
        issuer: "ICP-Brasil",
        notBefore: new Date(),
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        serialNumber: "1234567890",
        tipo: "A1",
        status: "valido",
      };
    } catch {
      return null;
    }
  }
}

export const saudeStatus = new SaudeStatus();