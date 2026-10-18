import { ActionProviderContribution, CommandAction, ActionResult } from "@hub/reactor-config";
import { matchRequest, type Handoff } from "@hub/capacity-engine";
import {
  adaptCapacities,
  adaptRequests,
  beautyCriteria,
  BEAUTY_DEFAULT_RADIUS_KM,
  BEAUTY_MAX_RADIUS_KM,
  type BeautyOperationalDocument,
} from "./capacity";

/**
 * Estado operacional injetado pelo host. Sem documento real, as acoes de
 * capacidade respondem `success: false` com a lacuna, em vez de fingir sucesso.
 */
let activeDocument: BeautyOperationalDocument | null = null;
let handoffLog: Handoff[] = [];

export function setOperationalDocument(document: BeautyOperationalDocument | null): void {
  activeDocument = document;
}

export function setHandoffLog(log: Handoff[]): void {
  handoffLog = log;
}

export function getHandoffLog(): Handoff[] {
  return handoffLog;
}

interface OverflowSearchOutput {
  matched: boolean;
  candidates: Array<{ providerId: string; score: number; reasons: string[]; blockers: string[] }>;
  matchableCount: number;
  blockers: string[];
}

function searchOverflow(params: Record<string, unknown>): OverflowSearchOutput {
  if (!activeDocument) {
    return {
      matched: false,
      candidates: [],
      matchableCount: 0,
      blockers: [
        "Nenhum documento operacional carregado. A capacidade real da rede ainda nao foi observada.",
      ],
    };
  }

  const capacities = adaptCapacities(activeDocument);
  const requests = adaptRequests(activeDocument);

  const blockers = capacities.gaps
    .concat(requests.gaps)
    .filter((gap) => gap.blocking)
    .map((gap) => `${gap.field}: ${gap.reason}`);

  const requestId = typeof params.requestId === "string" ? params.requestId : undefined;
  const request = requests.data.find((entry) => entry.id === requestId) ?? requests.data[0];

  if (!request) {
    return {
      matched: false,
      candidates: [],
      matchableCount: 0,
      blockers: blockers.length > 0 ? blockers : ["Nenhuma solicitacao de overflow registrada."],
    };
  }

  const result = matchRequest(request, capacities.data, beautyCriteria());
  return {
    matched: result.matchableCount > 0,
    candidates: result.candidates,
    matchableCount: result.matchableCount,
    blockers,
  };
}

function clampRadius(value: unknown): number {
  const raw = typeof value === "number" ? value : BEAUTY_DEFAULT_RADIUS_KM;
  if (!Number.isFinite(raw) || raw <= 0) return BEAUTY_DEFAULT_RADIUS_KM;
  return Math.min(raw, BEAUTY_MAX_RADIUS_KM);
}

export class BeautyActions implements ActionProviderContribution {
  getActions(): CommandAction[] {
    return [
      {
        id: "beauty:agendar",
        label: "Agendar atendimento",
        description: "Cria agendamento para cliente/serviço/profissional",
        category: "operation",
        keywords: ["agendar", "marcar", "cliente", "serviço", "profissional"],
        execute: async () => {},
      },
      {
        id: "beauty:remarcar",
        label: "Remarcar atendimento",
        description: "Altera horário de um agendamento existente",
        category: "operation",
        keywords: ["remarcar", "alterar", "horário", "reagendar"],
        execute: async () => {},
      },
      {
        id: "beauty:cancelar",
        label: "Cancelar atendimento",
        description: "Cancela agendamento e libera slot",
        category: "operation",
        keywords: ["cancelar", "liberar", "slot", "cancelamento"],
        execute: async () => {},
      },
      {
        id: "beauty:lembrete",
        label: "Enviar lembrete",
        description: "Envia lembrete de agendamento (WhatsApp/SMS)",
        category: "operation",
        keywords: ["lembrete", "whatsapp", "sms", "notificação"],
        execute: async () => {},
      },
      {
        id: "beauty:design",
        label: "Registrar design",
        description: "Registra nail art/design realizado",
        category: "operation",
        keywords: ["design", "nail art", "foto", "portfólio"],
        execute: async () => {},
      },
      {
        id: "beauty:overflow",
        label: "Buscar parceiro compatível",
        description: "Cruza a solicitação excedente com a capacidade declarada das parceiras próximas",
        category: "operation",
        keywords: ["overflow", "parceiro", "capacidade", "bairro", "raio"],
        execute: async () => {},
      },
      {
        id: "beauty:aprovar",
        label: "Registrar decisão da parceira",
        description: "Registra aceite ou recusa manual da parceira sobre um encaminhamento proposto",
        category: "operation",
        keywords: ["aprovar", "recusar", "overflow", "parceira", "manual"],
        execute: async () => {},
      },
      {
        id: "beauty:no-show",
        label: "Registrar no-show",
        description: "Marca cliente que não compareceu",
        category: "status",
        keywords: ["no-show", "falta", "cancelamento", "perda"],
        execute: async () => {},
      },
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<ActionResult> {
    switch (actionId) {
      case "beauty:agendar":
        return { success: true, output: { message: `Agendamento criado para cliente ${params.clientId}` } };
      case "beauty:remarcar":
        return { success: true, output: { message: `Agendamento ${params.appointmentId} remarcado` } };
      case "beauty:cancelar":
        return { success: true, output: { message: `Agendamento ${params.appointmentId} cancelado` } };
      case "beauty:lembrete":
        return { success: true, output: { message: `Lembrete enviado para ${params.clientId}` } };
      case "beauty:design":
        return { success: true, output: { message: `Design registrado para ${params.appointmentId}` } };
      case "beauty:overflow": {
        const radiusKm = clampRadius(params.radiusKm);
        const search = searchOverflow({ ...params, radiusKm });
        if (search.blockers.length > 0 && !search.matched) {
          return {
            success: false,
            error: `Capacidade real ainda não observada: ${search.blockers.join("; ")}`,
            output: { radiusKm, blockers: search.blockers, candidates: [], matchableCount: 0 },
          };
        }
        return {
          success: true,
          output: {
            radiusKm,
            matchableCount: search.matchableCount,
            candidates: search.candidates,
            blockers: search.blockers,
          },
        };
      }
      case "beauty:aprovar": {
        const decision = params.decision === "declined" ? "providerDecline" : "providerConfirm";
        const requestId = typeof params.requestId === "string" ? params.requestId : undefined;
        const providerId = typeof params.partnerId === "string" ? params.partnerId : undefined;

        if (!requestId || !providerId) {
          return {
            success: false,
            error: "requestId e partnerId são obrigatórios para registrar a decisão da parceira",
          };
        }

        handoffLog = handoffLog.filter(
          (handoff) => !(handoff.requestId === requestId && handoff.providerId === providerId),
        );
        handoffLog.push({
          id: `${requestId}:${providerId}`,
          requestId,
          providerId,
          status: params.decision === "declined" ? "declined" : "accepted",
          providerDecision: {
            actor: "provider",
            decision: params.decision === "declined" ? "declined" : "accepted",
            at: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        });

        return {
          success: true,
          output: {
            requestId,
            providerId,
            event: decision,
            handoffs: handoffLog.length,
          },
        };
      }
      case "beauty:no-show":
        return { success: true, output: { message: `No-show registrado para ${params.appointmentId}` } };
      default:
        return { success: false, error: `Ação desconhecida: ${actionId}` };
    }
  }
}

export const beautyActions = new BeautyActions();
