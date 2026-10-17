import { Extension } from "@hub/reactor-config";
import {
  EntityParserContribution,
  TimelineProviderContribution,
  StatusProviderContribution,
  ActionProviderContribution,
  GlossaryProviderContribution,
} from "@hub/reactor-config";

import { SaudeParser, saudeParser } from "./parser";
import { SaudeTimeline, saudeTimeline } from "./timeline";
import { SaudeStatus, saudeStatus } from "./status";
import { SaudeActions, saudeActions } from "./actions";
import { SaudeGlossary, saudeGlossary } from "./glossary";

export const saudePlugin: Extension = {
  id: "hub-saude",
  name: "SaúdeOps",
  version: "1.0.0",
  contributes: {
    "hub.parser": saudeParser,
    "hub.timeline": saudeTimeline,
    "hub.status": saudeStatus,
    "hub.actions": saudeActions,
    "hub.glossary": saudeGlossary,
  },
  activate: async () => {
    console.log("[SaúdeOps] Plugin ativado");
  },
  deactivate: async () => {
    console.log("[SaúdeOps] Plugin desativado");
  },
};

export {
  SaudeParser,
  SaudeTimeline,
  SaudeStatus,
  SaudeActions,
  SaudeGlossary,
  saudeParser,
  saudeTimeline,
  saudeStatus,
  saudeActions,
  saudeGlossary,
};