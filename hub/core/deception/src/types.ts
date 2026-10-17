export interface TarpitMetrics {
  totalCaptures: number;
  uniqueIPs: number;
  totalBytesServed: number;
  averageRetentionSeconds: number;
  topUserAgents: UserAgentMetric[];
  capturesByHour: HourlyMetric[];
  falsePositives: number;
}

export interface UserAgentMetric {
  userAgent: string;
  count: number;
  totalBytes: number;
  averageRetention: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface HourlyMetric {
  hour: Date;
  captures: number;
  bytes: number;
  uniqueIPs: number;
}

export interface HoneypotMetrics {
  uptime: number;
  stagesGenerated: number;
  tokensServed: number;
  interactions: HoneypotInteraction[];
}

export interface HoneypotInteraction {
  id: string;
  timestamp: Date;
  sourceIP: string;
  userAgent: string;
  stage: string;
  path: string;
  token?: string;
  duration: number;
}

export interface DeceptionMetrics extends TarpitMetrics, HoneypotMetrics {
  mitreEngage: MitreEngageMapping;
}

export interface MitreEngageMapping {
  affect: { retentionSeconds: number; captures: number };
  elicit: { bytesServed: number; stagesGenerated: number };
  expose: { userAgents: string[]; uniqueIPs: number };
  prepare: { blockedIPs: number; crowdsecEvents: number };
  understand: { falsePositiveRate: number; legitimateTraffic: number };
}

export const MITRE_ENGAGE_ACTIVITIES = {
  affect: "Manter o adversário engajado consumindo recursos",
  elicit: "Extrair informação sobre ferramentas e intenções do adversário",
  expose: "Identificar ferramentas, infraestrutura e TTPs do adversário",
  prepare: "Alimentar listas de bloqueio e inteligência de ameaças",
  understand: "Validar eficácia da deception e calibrar falsos positivos",
} as const;

export type MitreEngageActivity = keyof typeof MITRE_ENGAGE_ACTIVITIES;

export interface LogEntry {
  timestamp: Date;
  remoteAddr: string;
  remoteUser: string;
  request: string;
  status: number;
  bodyBytesSent: number;
  httpUserAgent: string;
  httpXForwardedFor: string;
  tarpitHit: boolean;
}