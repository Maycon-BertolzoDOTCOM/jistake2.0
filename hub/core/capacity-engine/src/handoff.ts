import { Handoff, HandoffEvent, HandoffStatus } from "./types";

export const TERMINAL_STATUSES: HandoffStatus[] = [
  "declined",
  "completed",
  "expired",
  "cancelled",
];

export function isTerminal(status: HandoffStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export class InvalidTransitionError extends Error {
  constructor(from: HandoffStatus, event: HandoffEvent) {
    super(`Invalid handoff transition: cannot apply "${event}" to status "${from}"`);
    this.name = "InvalidTransitionError";
  }
}

const TRANSITIONS: Record<HandoffStatus, Partial<Record<HandoffEvent, HandoffStatus>>> = {
  requested: { offer: "offered", cancel: "cancelled", expire: "expired" },
  offered: {
    clientAccept: "accepted",
    clientDecline: "declined",
    providerDecline: "declined",
    providerConfirm: "accepted",
    cancel: "cancelled",
    expire: "expired",
  },
  accepted: { complete: "completed", providerConfirm: "accepted", cancel: "cancelled", expire: "expired" },
  declined: {},
  completed: {},
  expired: {},
  cancelled: {},
};

export interface AdvanceOptions {
  at: string;
}

export function advanceHandoff(
  handoff: Handoff,
  event: HandoffEvent,
  options: AdvanceOptions,
): Handoff {
  if (isTerminal(handoff.status)) {
    throw new InvalidTransitionError(handoff.status, event);
  }

  const allowed = TRANSITIONS[handoff.status];
  const next = allowed[event];

  if (next === undefined) {
    throw new InvalidTransitionError(handoff.status, event);
  }

  const advanced: Handoff = { ...handoff, status: next, updatedAt: options.at };

  if (event === "clientAccept" || event === "clientDecline") {
    advanced.clientDecision = {
      actor: "client",
      decision: event === "clientAccept" ? "accepted" : "declined",
      at: options.at,
    };
  }

  if (event === "providerConfirm" || event === "providerDecline") {
    advanced.providerDecision = {
      actor: "provider",
      decision: event === "providerConfirm" ? "accepted" : "declined",
      at: options.at,
    };
  }

  if (event === "complete" && handoff.providerDecision?.decision !== "accepted") {
    throw new Error("A handoff can only be completed after the provider confirms availability");
  }

  return advanced;
}

export function canTransition(status: HandoffStatus, event: HandoffEvent): boolean {
  return TRANSITIONS[status][event] !== undefined;
}
