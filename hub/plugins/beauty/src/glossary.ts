import { GlossaryProviderContribution, GlossaryTerm } from "@hub/reactor-config";

const BEAUTY_GLOSSARY: GlossaryTerm[] = [
  {
    term: "Agenda lotada",
    definition: "Estado em que o salão não tem slots livres no período desejado pelo cliente.",
    category: "ops",
    related: ["overflow", "capacidade", "no-show"],
  },
  {
    term: "Overflow",
    definition: "Redirecionamento de cliente para parceiro próximo quando o salão está cheio.",
    category: "ops",
    related: ["contingência", "bairro", "parceiro"],
  },
  {
    term: "Contingência de bairro",
    definition: "Rede local de salões que aceitam clientes excedentes em até 5 km.",
    category: "ops",
    related: ["overflow", "parceiro", "bairro"],
  },
  {
    term: "No-show",
    definition: "Cliente que não comparece ao agendamento.",
    category: "ops",
    related: ["cancelamento", "lembrete", "perda"],
  },
  {
    term: "Slot",
    definition: "Horário disponível para atendimento.",
    category: "ops",
    related: ["agenda", "capacidade", "overflow"],
  },
  {
    term: "Capacidade",
    definition: "Número de clientes que o salão pode atender no período.",
    category: "ops",
    related: ["slot", "overflow", "quiz"],
  },
  {
    term: "Quiz de capacidade",
    definition: "Onboarding onde o parceiro informa quantos clientes pode receber.",
    category: "ops",
    related: ["parceiro", "overflow", "manual"],
  },
  {
    term: "Nail art",
    definition: "Design artístico em unhas (decoração, desenhos, efeitos).",
    category: "service",
    related: ["design", "portfólio", "galeria"],
  },
  {
    term: "Fidelidade",
    definition: "Programa de retenção de clientes (pontos, descontos, brindes).",
    category: "marketing",
    related: ["retenção", "cliente", "recompra"],
  },
  {
    term: "Comissão",
    definition: "Percentual ou valor fixo pago ao profissional por serviço.",
    category: "finance",
    related: ["receita", "profissional", "pagamento"],
  },
  {
    term: "Revenue share",
    definition: "Divisão de receita entre salão origem e parceiro de overflow.",
    category: "finance",
    related: ["overflow", "parceiro", "comissão"],
  },
  {
    term: "LGPD",
    definition: "Lei Geral de Proteção de Dados — aplicável a dados de clientes (nome, telefone, consentimento).",
    category: "legal",
    related: ["consentimento", "privacidade", "dados"],
  },
];

export class BeautyGlossary implements GlossaryProviderContribution {
  getTerms(): GlossaryTerm[] {
    return BEAUTY_GLOSSARY;
  }

  search(query: string): GlossaryTerm[] {
    const q = query.toLowerCase();
    return BEAUTY_GLOSSARY.filter(
      (term) =>
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.related?.some((r) => r.toLowerCase().includes(q))
    );
  }
}

export const beautyGlossary = new BeautyGlossary();
