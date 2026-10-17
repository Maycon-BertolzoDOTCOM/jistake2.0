import {
  StatusProviderContribution,
  StatusCheck,
  CertificateInfo,
} from "@hub/reactor-config";

interface KDMInfo {
  kdmId: string;
  cplId: string;
  startDate: Date;
  endDate: Date;
  trustedDeviceList: string[];
  encryptedKey: string;
}

export class CinemaStatus implements StatusProviderContribution {
  private kdmCache: Map<string, KDMInfo> = new Map();

  async check(entityId: string): Promise<StatusCheck> {
    const kdm = this.kdmCache.get(entityId);
    if (!kdm) {
      return {
        entityId,
        level: "unknown",
        message: "KDM não encontrado no cache",
      };
    }

    const now = new Date();
    if (now < kdm.startDate) {
      return {
        entityId,
        level: "warning",
        message: `KDM ainda não válida (inicia ${kdm.startDate.toLocaleDateString("pt-BR")})`,
        expiresAt: kdm.startDate,
        metadata: { kdmId: kdm.kdmId, status: "not_yet_valid" },
      };
    }

    if (now > kdm.endDate) {
      return {
        entityId,
        level: "critical",
        message: `KDM expirada em ${kdm.endDate.toLocaleDateString("pt-BR")}`,
        expiresAt: kdm.endDate,
        metadata: { kdmId: kdm.kdmId, status: "expired" },
      };
    }

    const daysLeft = Math.ceil((kdm.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let level: StatusCheck["level"] = "ok";
    let message = "KDM válida";

    if (daysLeft <= 7) {
      level = "warning";
      message = `KDM expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`;
    }

    return {
      entityId,
      level,
      message,
      expiresAt: kdm.endDate,
      metadata: { kdmId: kdm.kdmId, status: "valid", diasRestantes: daysLeft },
    };
  }

  async checkBatch(entityIds: string[]): Promise<StatusCheck[]> {
    return Promise.all(entityIds.map((id) => this.check(id)));
  }

  async getCertificateInfo(entityId: string): Promise<CertificateInfo | null> {
    const kdm = this.kdmCache.get(entityId);
    if (!kdm) return null;

    return {
      subject: `KDM-${kdm.kdmId}`,
      issuer: "Distribuidor",
      notBefore: kdm.startDate,
      notAfter: kdm.endDate,
      serialNumber: kdm.kdmId,
      fingerprint: kdm.kdmId.slice(0, 32),
      isRevoked: new Date() > kdm.endDate,
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

  addKDM(kdm: KDMInfo): void {
    this.kdmCache.set(kdm.kdmId, kdm);
  }

  parseKDM(xml: string): KDMInfo | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");

    const getText = (selector: string) => doc.querySelector(selector)?.textContent || "";

    const kdm: KDMInfo = {
      kdmId: getText("Id"),
      cplId: getText("CPLId"),
      startDate: new Date(getText("ValidFrom")),
      endDate: new Date(getText("ValidTo")),
      trustedDeviceList: Array.from(doc.querySelectorAll("TrustedDevice")).map((d) => d.textContent || ""),
      encryptedKey: getText("EncryptedKey"),
    };

    this.addKDM(kdm);
    return kdm;
  }
}

export const cinemaStatus = new CinemaStatus();