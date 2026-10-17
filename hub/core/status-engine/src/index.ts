export type StatusLevel = "ok" | "warning" | "critical" | "unknown";

export interface StatusCheck {
  entityId: string;
  level: StatusLevel;
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

export interface StatusProvider {
  check(entityId: string): Promise<StatusCheck>;
  checkBatch(entityIds: string[]): Promise<StatusCheck[]>;
  getCertificateInfo(entityId: string): Promise<CertificateInfo | null>;
  severity(level: StatusLevel): number;
}

export const SEVERITY_MAP: Record<StatusLevel, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
  unknown: 3,
};

export function severity(level: StatusLevel): number {
  return SEVERITY_MAP[level] ?? 3;
}

export function statusFromDaysUntilExpiry(days: number): StatusLevel {
  if (days < 0) return "critical";
  if (days <= 30) return "warning";
  return "ok";
}

export function daysUntilExpiry(notAfter: Date): number {
  const now = new Date();
  const diffMs = notAfter.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function createStatusCheck(
  entityId: string,
  level: StatusLevel,
  message: string,
  expiresAt?: Date,
  metadata?: Record<string, unknown>
): StatusCheck {
  return { entityId, level, message, expiresAt, metadata };
}