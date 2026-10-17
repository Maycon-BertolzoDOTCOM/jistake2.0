import { Extension } from "@hub/reactor-config";
import {
  EntityParserContribution,
  TimelineProviderContribution,
  StatusProviderContribution,
  ActionProviderContribution,
  GlossaryProviderContribution,
} from "@hub/reactor-config";

import { CinemaParser, cinemaParser } from "./parser";
import { CinemaTimeline, cinemaTimeline } from "./timeline";
import { CinemaStatus, cinemaStatus } from "./status";
import { CinemaActions, cinemaActions } from "./actions";
import { CinemaGlossary, cinemaGlossary } from "./glossary";

export const cinemaPlugin: Extension = {
  id: "hub-cinema",
  name: "CinemaOps",
  version: "1.0.0",
  contributes: {
    "hub.parser": cinemaParser,
    "hub.timeline": cinemaTimeline,
    "hub.status": cinemaStatus,
    "hub.actions": cinemaActions,
    "hub.glossary": cinemaGlossary,
  },
  activate: async () => {
    console.log("[CinemaOps] Plugin ativado");
  },
  deactivate: async () => {
    console.log("[CinemaOps] Plugin desativado");
  },
};

export {
  CinemaParser,
  CinemaTimeline,
  CinemaStatus,
  CinemaActions,
  CinemaGlossary,
  cinemaParser,
  cinemaTimeline,
  cinemaStatus,
  cinemaActions,
  cinemaGlossary,
};