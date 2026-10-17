import { ActionProviderContribution, CommandAction, ActionResult } from "@hub/reactor-config";

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
        label: "Buscar parceiro próximo",
        description: "Busca parceiros com capacidade livre em até 5 km",
        category: "operation",
        keywords: ["overflow", "parceiro", "capacidade", "bairro", "5km"],
        execute: async () => {},
      },
      {
        id: "beauty:aprovar",
        label: "Aprovar cliente overflow",
        description: "Parceiro aprova manualmente cliente redirecionado",
        category: "operation",
        keywords: ["aprovar", "overflow", "parceiro", "manual"],
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
      case "beauty:overflow":
        return { success: true, output: { message: `Parceiros com capacidade livre em até ${params.radiusKm || 5} km` } };
      case "beauty:aprovar":
        return { success: true, output: { message: `Cliente ${params.clientId} aprovado pelo parceiro ${params.partnerId}` } };
      case "beauty:no-show":
        return { success: true, output: { message: `No-show registrado para ${params.appointmentId}` } };
      default:
        return { success: false, error: `Ação desconhecida: ${actionId}` };
    }
  }
}

export const beautyActions = new BeautyActions();
