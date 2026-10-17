import { SecurityParser, RegistryEntry } from "./parser";
import { ActionProviderContribution, CommandAction, ActionResult } from "@hub/reactor-config";
import { securityParser } from "./parser";

const JANUS_CLI_PATH = process.env.JANUS_CLI_PATH || "../../../janus";
const ESCAPEKIT_PATH = process.env.ESCAPEKIT_PATH || "../../../escapekit-mcp";

export class SecurityActions implements ActionProviderContribution {
  private parser: SecurityParser;

  constructor(parser: SecurityParser = securityParser) {
    this.parser = parser;
  }

  getActions(): CommandAction[] {
    return [
      {
        id: "security:audit",
        label: "Executar Auditoria Janus",
        description: "Roda pipeline cat1–cat12 no GPT selecionado",
        shortcut: "g,a",
        category: "operation",
        keywords: ["auditoria", "janus", "gpt", "teste", "ataque"],
        execute: async () => {
          // Será chamado via Command Palette com parâmetros
        },
      },
      {
        id: "security:audit:full",
        label: "Auditoria Completa (Todas Categorias)",
        description: "Executa todas as 12 categorias de ataque",
        category: "operation",
        keywords: ["completa", "todas", "categorias", "cat1-12"],
        execute: async () => {},
      },
      {
        id: "security:audit:quick",
        label: "Auditoria Rápida (cat1, cat2, cat8)",
        description: "Executa apenas categorias críticas",
        category: "operation",
        keywords: ["rápida", "critica", "cat1", "cat2", "cat8"],
        execute: async () => {},
      },
      {
        id: "security:liberar",
        label: "Libertar Sandbox (EscapeKit)",
        description: "Extrai código de sandbox para produção via MCP",
        shortcut: "g,l",
        category: "operation",
        keywords: ["escapekit", "sandbox", "libertar", "mcp", "código"],
        execute: async () => {},
      },
      {
        id: "security:rea",
        label: "Nova Investigação REA",
        description: "Inicia engenharia reversa assistida",
        shortcut: "g,r",
        category: "intelligence",
        keywords: ["rea", "reverso", "binário", "investigação"],
        execute: async () => {},
      },
      {
        id: "security:vendas",
        label: "Nova Campanha Vendas",
        description: "Cria pipeline de outreach automatizado",
        category: "operation",
        keywords: ["vendas", "outreach", "campanha", "lead"],
        execute: async () => {},
      },
      {
        id: "security:relatorio",
        label: "Gerar Relatório Consolidado",
        description: "Consolida achados em formato de vulnerabilidade",
        category: "intelligence",
        keywords: ["relatório", "achados", "consolidado", "vulnerabilidade"],
        execute: async () => {},
      },
      {
        id: "security:fila",
        label: "Ver Fila de Auditoria",
        description: "Mostra fila YAML e status dos jobs",
        category: "status",
        keywords: ["fila", "queue", "jobs", "status"],
        execute: async () => {},
      },
      {
        id: "security:config",
        label: "Configurar Registry",
        description: "Edita registry.yaml e categorias",
        category: "operation",
        keywords: ["config", "registry", "categorias", "yaml"],
        execute: async () => {},
      },
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<ActionResult> {
    try {
      switch (actionId) {
        case "security:audit":
          return await this.runJanusAudit(params.gptId as string, params.categories as string[]);

        case "security:audit:full":
          return await this.runJanusAudit(params.gptId as string, "all");

        case "security:audit:quick":
          return await this.runJanusAudit(params.gptId as string, ["cat1_direta", "cat2_roleplay", "cat8_output_embedding"]);

        case "security:liberar":
          return await this.runEscapeKit(params.sandboxId as string, params.targetPath as string);

        case "security:rea":
          return await this.runReaInvestigation(params.target as string, params.type as string);

        case "security:vendas":
          return await this.createSalesCampaign(params);

        case "security:relatorio":
          return await this.generateReport(params.since as string);

        case "security:fila":
          return await this.getQueueStatus();

        case "security:config":
          return await this.openConfig();

        default:
          return { success: false, error: `Ação desconhecida: ${actionId}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async runJanusAudit(gptId: string, categories: string[] | "all"): Promise<ActionResult> {
    const entry = await this.parser.getGPTById(gptId);
    if (!entry) {
      return { success: false, error: `GPT ${gptId} não encontrado` };
    }

    if (!this.parser.isAuthorized(entry)) {
      return { success: false, error: `GPT ${gptId} não autorizado ou fora da janela` };
    }

    const catArg = categories === "all" ? "" : `--categorias ${categories.join(",")}`;

    const command = `cd ${JANUS_CLI_PATH} && python -m janus.queue.cli enqueue --link "${entry.link}" ${catArg} && python -m janus.queue.cli run --link "${entry.link}"`;

    return {
      success: true,
      output: {
        command,
        gptId: entry.id,
        link: entry.link,
        categories: categories === "all" ? "todas (cat1–cat12)" : categories,
        message: `Auditoria enfileirada. Execute: ${command}`,
      },
    };
  }

  private async runEscapeKit(sandboxId: string, targetPath: string): Promise<ActionResult> {
    const command = `cd ${ESCAPEKIT_PATH} && python -m escapekit extract --sandbox ${sandboxId} --target ${targetPath}`;

    return {
      success: true,
      output: {
        command,
        sandboxId,
        targetPath,
        message: `Extração iniciada. Execute: ${command}`,
      },
    };
  }

  private async runReaInvestigation(target: string, type: string): Promise<ActionResult> {
    const command = `cd ${JANUS_CLI_PATH} && python -m rea investigate --target ${target} --type ${type}`;

    return {
      success: true,
      output: { command, target, type, message: `Investigação REA iniciada` },
    };
  }

  private async createSalesCampaign(params: Record<string, unknown>): Promise<ActionResult> {
    return {
      success: true,
      output: { message: "Campanha de vendas criada via hub-web /vendas/nova", params },
    };
  }

  private async generateReport(since: string): Promise<ActionResult> {
    const command = `cd ${JANUS_CLI_PATH} && python -m janus.queue.cli report --since ${since}`;

    return {
      success: true,
      output: { command, since, message: `Relatório gerado em janus/relatorios/` },
    };
  }

  private async getQueueStatus(): Promise<ActionResult> {
    const command = `cd ${JANUS_CLI_PATH} && python -m janus.queue.cli status`;

    return {
      success: true,
      output: { command, message: "Status da fila exibido" },
    };
  }

  private async openConfig(): Promise<ActionResult> {
    return {
      success: true,
      output: {
        message: "Configuração disponível em janus/links/registry.yaml e janus/runner/tests/",
        files: [
          "../../../janus/links/registry.yaml",
          "../../../janus/runner/tests/",
        ],
      },
    };
  }
}

export const securityActions = new SecurityActions();