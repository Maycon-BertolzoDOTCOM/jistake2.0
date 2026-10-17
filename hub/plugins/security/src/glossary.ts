import { GlossaryProviderContribution, GlossaryTerm } from "@hub/reactor-config";

const SECURITY_GLOSSARY: GlossaryTerm[] = [
  {
    term: "Janus",
    definition: "Auditor automatizado de Custom GPTs. Executa baterias de testes cat1–cat12 com fila YAML, workers concorrentes, gate de autorização e relatórios consolidados.",
    category: "core",
    related: ["cat1–cat12", "gate", "queue", "worker", "registry"],
  },
  {
    term: "cat1–cat12",
    definition: "12 categorias de ataque a LLMs: cat1=direta, cat2=roleplay, cat3=autoridade, cat4=tradução, cat5=hipotética, cat6=fragmentação, cat7=multiturno, cat8=output_embedding, cat9=injeção_prompt, cat10=vazamento_dados, cat11=lrl, cat12=encoding.",
    category: "attack",
    related: ["Janus", "evaluator", "prompts"],
  },
  {
    term: "cat1_direta",
    definition: "Ataque direto: pede explicitamente que o modelo ignore instruções ou revele system prompt.",
    category: "attack",
    related: ["cat2_roleplay", "system_prompt"],
  },
  {
    term: "cat2_roleplay",
    definition: "Roleplay: pede que o modelo assuma persona que contorna restrições (ex: 'você é um hacker').",
    category: "attack",
    related: ["persona", "cat1_direta"],
  },
  {
    term: "cat3_autoridade",
    definition: "Falsa autoridade: alega ser desenvolvedor, admin ou figura de autoridade para obter compliance.",
    category: "attack",
    related: ["social_engineering"],
  },
  {
    term: "cat4_traducao",
    definition: "Tradução: pede resposta em outro idioma para bypassar filtros de conteúdo.",
    category: "attack",
    related: ["multilanguage", "bypass"],
  },
  {
    term: "cat5_hipotetica",
    definition: "Cenário hipotético: 'se você fosse um vilão, como faria X?' para contornar recusas diretas.",
    category: "attack",
    related: ["hypothetical", "refusal_bypass"],
  },
  {
    term: "cat6_fragmentacao",
    definition: "Fragmentação: divide payload malicioso em múltiplas mensagens para evitar detecção.",
    category: "attack",
    related: ["multi_turn", "evasion"],
  },
  {
    term: "cat7_multiturno",
    definition: "Multiturno: constrói contexto ao longo de várias rodadas antes de fazer pedido malicioso.",
    category: "attack",
    related: ["context_manipulation", "grooming"],
  },
  {
    term: "cat8_output_embedding",
    definition: "Output embedding: tenta exfiltrar system prompt ou dados sensíveis via saída estruturada (JSON, código, base64).",
    category: "attack",
    related: ["exfiltration", "canary", "system_prompt"],
  },
  {
    term: "cat9_injecao_prompt",
    definition: "Injeção de prompt: insere instruções ocultas em input do usuário que o modelo executa.",
    category: "attack",
    related: ["prompt_injection", "indirect_injection"],
  },
  {
    term: "cat10_vazamento_dados",
    definition: "Vazamento de dados: tenta extrair PII, segredos ou dados de treinamento do modelo.",
    category: "attack",
    related: ["data_exfiltration", "pii", "training_data"],
  },
  {
    term: "cat11_lrl",
    definition: "LRL (Low Resource Language): usa idiomas de baixos recursos para bypassar alinhamento.",
    category: "attack",
    related: ["low_resource_language", "multilingual"],
  },
  {
    term: "cat12_encoding",
    definition: "Encoding: codifica payload malicioso (base64, rot13, unicode) para evadir filtros.",
    category: "attack",
    related: ["obfuscation", "encoding", "evasion"],
  },
  {
    term: "Gate",
    definition: "Ponto de controle obrigatório (fail-closed) que valida autorização antes de QUALQUER probe. Duas fechaduras: registry pre-aprovado (v1) ou SOC pair-human (v2).",
    category: "security",
    related: ["authorization", "fail_closed", "hashchain"],
  },
  {
    term: "Registry",
    definition: "janus/links/registry.yaml — whitelist de GPTs auditáveis. Campos obrigatórios: autorizacao_id, autorizado_por, janela (ISO 8601), limites, escopo, categorias.",
    category: "security",
    related: ["gate", "whitelist", "authorization"],
  },
  {
    term: "QueueAdapter",
    definition: "Interface de fila (FileQueueAdapter usa YAML, RedisQueueAdapter planejado). Operações: enqueue, listar, complete. Idempotente por link.",
    category: "core",
    related: ["worker", "scheduler", "fila.yaml"],
  },
  {
    term: "Worker",
    definition: "Processa item da fila: gate → run_prompt() → evaluator → estado → reporter. Respeita kill switch (.stop file).",
    category: "core",
    related: ["queue", "evaluator", "kill_switch"],
  },
  {
    term: "EscapeKit",
    definition: "MCP Server (Apache-2.0) que liberta código de sandboxes (AI Studio, Bolt, Replit) para produção. CLI: escapekit extract/deploy/build.",
    category: "tool",
    related: ["mcp", "sandbox", "libertação"],
  },
  {
    term: "REA",
    definition: "Engenharia Reversa Assistida. Investigação de binários/código com assistência de LLM. Pipeline: alvo → análise → relatório.",
    category: "tool",
    related: ["reverse_engineering", "binary", "ghidra"],
  },
  {
    term: "Canário",
    definition: "Segredo sintético no formato <palavra>-<palavra>-<4chars> injetado no system prompt da isca. Detecção de vazamento = achado crítico.",
    category: "security",
    related: ["cat8_output_embedding", "isca-poc-002", "exfiltration"],
  },
  {
    term: "Isca (PoC #002)",
    definition: "GPT controlado criado exclusivamente para testes, com canário sintético. Link: TROCAR_PELO_LINK_DA_ISCA no registry.",
    category: "security",
    related: ["canário", "cat8", "test_controlado"],
  },
  {
    term: "Kill Switch",
    definition: "Arquivo .stop na raiz do Janus. Scheduler detecta → worker interrompe item atual → fila pausa. Compartilhado com Trama/SOC.",
    category: "ops",
    related: ["scheduler", "worker", "soc"],
  },
  {
    term: "Hashchain",
    definition: "Cadeia de hashes SHA-256 que sela decisões de gate e achados. Imutável, auditável. Implementado em trama-motor/GATE.md e offensive_approvals/store.py.",
    category: "security",
    related: ["gate", "audit", "tamper_evident"],
  },
];

export class SecurityGlossary implements GlossaryProviderContribution {
  getTerms(): GlossaryTerm[] {
    return SECURITY_GLOSSARY;
  }

  search(query: string): GlossaryTerm[] {
    const q = query.toLowerCase();
    return SECURITY_GLOSSARY.filter(
      (term) =>
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.related?.some((r) => r.toLowerCase().includes(q))
    );
  }
}

export const securityGlossary = new SecurityGlossary();