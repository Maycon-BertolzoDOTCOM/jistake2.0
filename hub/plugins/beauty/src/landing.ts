import { PageSchema, renderPage, themeFromNail, validatePage } from "@hub/pageforge";
import { contentForge } from "@hub/contentforge";

export const beautyLandingSchema: PageSchema = {
  id: "beauty-landing",
  title: "BeautyOps",
  description: "Contingência de bairro para salões e nail studios",
  theme: themeFromNail("#ec4899"),
  accessibility: { skipLink: true, landmarkRoles: true },
  perfBudget: { maxHtmlKb: 100 },
  sections: [
    {
      id: "hero",
      constructs: [
        {
          id: "hero-1",
          type: "hero",
          props: {
            headline: "Agenda lotada?",
            subheadline: "Não perca cliente. Redirecione para parceiros perto.",
            ctaLabel: "Quero minha bios",
            ctaHref: "#quiz",
          },
        },
      ],
    },
    {
      id: "quiz",
      constructs: [
        {
          id: "quiz-1",
          type: "quiz",
          props: {
            title: "Encontre o melhor parceiro perto de você",
            questions: [
              { label: "Qual serviço você precisa?", options: ["Manicure", "Pedicure", "Nail art", "Sobrancelhas"] },
              { label: "Qual seu bairro?", options: ["Vila Nova York", "Vila Formosa", "Tatuapé", "Carrão"] },
              { label: "Quando você precisa?", options: ["Hoje", "Amanhã", "Esta semana"] },
            ],
            submitLabel: "Ver parceiros",
          },
        },
      ],
    },
    {
      id: "proof",
      constructs: [
        {
          id: "proof-1",
          type: "proof",
          props: { items: ["90–120 chamadas no Instagram", "20–50 atendimentos por semana", "5 km de contingência"] },
        },
      ],
    },
    {
      id: "features",
      constructs: [
        {
          id: "features-1",
          type: "features",
          props: {
            items: [
              { title: "Bios profissional", description: "Site + infra + landing por R$79/mês." },
              { title: "Overflow de bairro", description: "Parceiros com capacidade livre em até 5 km." },
              { title: "Aprovação manual", description: "Parceiro define quantos pode receber." },
            ],
          },
        },
      ],
    },
    {
      id: "pricing",
      constructs: [
        {
          id: "pricing-1",
          type: "pricing",
          props: {
            plans: [
              { name: "Bios", price: "R$79/mês", features: ["Site", "Infra", "Landing"] },
              { name: "WhatsApp", price: "R$1.000 setup", features: ["Automação", "Lembretes", "CRM"] },
            ],
          },
        },
      ],
    },
    {
      id: "cta",
      constructs: [
        {
          id: "cta-1",
          type: "cta",
          props: { label: "Quero ser parceiro", href: "#contato" },
        },
      ],
    },
  ],
};

export function renderBeautyLanding(): string {
  const validation = validatePage(beautyLandingSchema);
  if (!validation.valid) {
    throw new Error(`Invalid beauty landing schema: ${validation.errors.join("; ")}`);
  }
  return renderPage(beautyLandingSchema);
}

export function generateBeautyCopy(): string {
  return contentForge.generateLanding({
    title: "BeautyOps",
    headline: "Agenda lotada? Não perca cliente.",
    subheadline: "Redirecione para parceiros perto e mantenha a demanda no bairro.",
    valueProps: ["Bios profissional", "Overflow de bairro", "Aprovação manual"],
    cta: "Quero minha bios",
    vertical: "beauty",
  }).content;
}
