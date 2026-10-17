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
  },
  activate: async () => {
    console.log("[BeautyOps] Plugin ativado");
  },
  deactivate: async () => {
    console.log("[BeautyOps] Plugin desativado");
  },
};

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
