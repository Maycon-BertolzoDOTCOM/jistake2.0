import { Extension } from "@hub/reactor-config";
import {
  EntityParserContribution,
  TimelineProviderContribution,
  StatusProviderContribution,
  ActionProviderContribution,
  GlossaryProviderContribution,
} from "@hub/reactor-config";

import { SecurityParser, securityParser } from "./parser";
import { SecurityTimeline, securityTimeline } from "./timeline";
import { SecurityStatus, securityStatus } from "./status";
import { SecurityActions, securityActions } from "./actions";
import { SecurityGlossary, securityGlossary } from "./glossary";

export const securityPlugin: Extension = {
  id: "hub-security",
  name: "SecurityOps",
  version: "1.0.0",
  contributes: {
    "hub.parser": securityParser,
    "hub.timeline": securityTimeline,
    "hub.status": securityStatus,
    "hub.actions": securityActions,
    "hub.glossary": securityGlossary,
  },
  activate: async () => {
    console.log("[SecurityOps] Plugin ativado");
    await securityParser.getRegistry();
    await securityParser.getCategories();
  },
  deactivate: async () => {
    console.log("[SecurityOps] Plugin desativado");
  },
};

export {
  SecurityParser,
  SecurityTimeline,
  SecurityStatus,
  SecurityActions,
  SecurityGlossary,
  securityParser,
  securityTimeline,
  securityStatus,
  securityActions,
  securityGlossary,
};