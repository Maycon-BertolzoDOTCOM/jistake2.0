import { Extension } from "@hub/reactor-config";
import {
  EntityParserContribution,
  TimelineProviderContribution,
  StatusProviderContribution,
  ActionProviderContribution,
  GlossaryProviderContribution,
} from "@hub/reactor-config";

import { BeautyParser, beautyParser } from "./parser";
import { BeautyTimeline, beautyTimeline } from "./timeline";
import { BeautyStatus, beautyStatus } from "./status";
import { BeautyActions, beautyActions } from "./actions";
import { BeautyGlossary, beautyGlossary } from "./glossary";
import { beautyCapacityCriteria } from "./capacity";

export const beautyPlugin: Extension = {
  id: "hub-beauty",
  name: "BeautyOps",
  version: "1.0.0",
  contributes: {
    "hub.parser": beautyParser,
    "hub.timeline": beautyTimeline,
    "hub.status": beautyStatus,
    "hub.actions": beautyActions,
    "hub.glossary": beautyGlossary,
    "hub.capacity": beautyCapacityCriteria,
  },
  activate: async () => {
    console.log("[BeautyOps] Plugin ativado");
  },
  deactivate: async () => {
    console.log("[BeautyOps] Plugin desativado");
  },
};

export {
  beautyCapacityCriteria,
  adaptCapacities,
  adaptRequests,
  beautyCriteria,
  BEAUTY_SCOPE,
  BEAUTY_DEFAULT_RADIUS_KM,
  BEAUTY_MAX_RADIUS_KM,
} from "./capacity";
export { assessBeautyCapacity } from "./capacity-readiness";
export {
  resolveLocation,
  normalizeNeighborhood,
  sameNeighborhood,
} from "./location";
export type {
  ProviderLocation,
  LocationResolution,
  RawLocation,
} from "./location";
export {
  matchGeographically,
  matchRegionally,
  matchByAvailablePrecision,
  canMatchOnLocation,
  isVerifiedEvidence,
} from "./location-matching";
export type { GeographicMatch, RegionalMatch, LocationMatch } from "./location-matching";
export { auditLocationMatching } from "./location-audit";
export type {
  LocationAuditEntry,
  LocationPrecisionSummary,
  LocationAuditReason,
} from "./location-audit";
export type { CapacityGap, BeautyOperationalDocument } from "./capacity";

export {
  BeautyParser,
  BeautyTimeline,
  BeautyStatus,
  BeautyActions,
  BeautyGlossary,
  beautyParser,
  beautyTimeline,
  beautyStatus,
  beautyActions,
  beautyGlossary,
};
