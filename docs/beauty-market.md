# BeautyOps Market Viability — Salão / Unhas / Nail

## 1. Resumo executivo
BeautyOps é um sistema de **contingência de bairro** para salões e nail studios. Quando um estabelecimento está lotado, ele redireciona a demanda para parceiros próximos com capacidade livre, preservando receita e criando efeito rede.

## 2. Problema
- Salões recebem 90–120 chamadas no Instagram, mas atendem ~20–50 clientes por semana.
- Cliente quer rapidez; salão perde receita por falta de encaixe.
- Pequenos salões têm ociosidade; grandes têm fila.
- Não existe fallback local padronizado.

## 3. Mercado
- Nicho: salão pequeno, médio, grande, nail studio independente.
- Todos podem ganhar; pequenos se beneficiam mais via efeito rede.
- Demanda local concentrada; oferta fragmentada.

## 4. Solução
- Overflow routing por bairro (raio padrão: 5 km, configurável até 8 km).
- Piloto começa onde houver **maior entropia de movimento** (fluxo de pessoas), não necessariamente o bairro de moradia.
- Aprovação manual inicial por parceiro (quiz de capacidade).
- Automação depois, com limite definido pelo parceiro.
- Landing pages de estudo: “agenda lotada? veja parceiros perto”.

## 5. Modelo de negócio
- **Bios**: R$79/mês (site + infra + landing).
- **WhatsApp automático**: R$1.000 setup + R$99/mês (upsell posterior).
- **Comissão fixa por cliente convertido**:
  - 0–49 concluídos: R$7
  - 50–99 concluídos: R$9
  - 100+ concluídos: R$12
  - Condição: rating ≥ 4.5 e no-show < 15%
- **Comissão**: fixa no MVP; percentual apenas após histórico.

## 6. Onboarding de parceiros (quiz)
- Capacidade semanal estimada.
- Quantos clientes pode receber.
- Especialidades (unhas, cabelo, estética).
- Horários livres.
- Limite de overflow aceito.
- Política de no-show.
- Tempo médio por serviço.

## 7. Fluxo operacional
1. Cliente tenta agendar no salão A.
2. A está cheio → sugere parceiros B/C com slot livre.
3. Cliente escolhe → A envia lead com consentimento.
4. B aprova/rejeita manualmente.
5. Agendamento confirmado + tracking de origem.
6. Feedback pós-atendimento.

## 8. Governança
- Onboarding e vetting de parceiros.
- Rating bilateral.
- Política de no-show e cancelamento.
- Revenue share/comissão.
- Consentimento de dados (LGPD): **opt-in explícito** antes de compartilhar lead.
- Se não houver consentimento, mostrar parceiros e deixar o cliente escolher.
- Parceiro define limite de overflow.
- Comunidade: **adiada**; tudo via Instagram no MVP.

## 9. Métricas
- taxa de overflow convertido
- ocupação dos parceiros
- no-show por origem
- tempo médio até agendamento
- NPS do cliente e do parceiro
- retenção da rede
- receita recuperada

## 10. Cost model
```
Custo base = infra + suporte + onboarding
Custo variável = (leads * custo por lead) + (no-show * perda)
Preço mínimo = (custo base + custo variável) / (1 - margem)
```
- Infra: Oracle free + Vercel (custo baixo).
- Suporte: minutos/mês.
- WhatsApp: mensagens/API.
- No-show: perda estimada.
- Margem alvo: ex. 60%.

## 11. Cash flow
- Separar MRR (recorrente) de setup (one-time).
- Revenue share accrual mensal, não antecipado.
- Usar créditos/escrow para comissões pendentes.
- Evitar desconto anual grande no MVP.
- Dashboard: MRR, ARR, churn, CAC, LTV, cash collected vs recognized revenue.

## 12. Riscos e mitigação
- Cold start → começar com 1 bairro e 10 salões.
- Qualidade inconsistente → onboarding com quiz + rating bilateral.
- No-show → tracking por origem + lembrete + política de cancelamento.
- Privacidade → consentimento explícito; LGPD.
- Canibalização → parceiro aceita manualmente e define limite.

## 13. Roadmap
1. Pesquisa de bairro + entrevistas com profissionais solo.
2. MVP de matching manual + landing pages.
3. Automação de agenda e parceiros.
4. Comunidade via Instagram (parceiros verificados depois).
5. Escala por região.

## 14. Integração DeskcommCRM
- Fase 1: docs de mercado + copy.
- Fase 2: BeautyOps MVP.
- Fase 3: DeskcommCRM como CRM/WhatsApp para parceiros (upsell R$1.000).
- Fase 4: escala regional + automações.

## 15. FAQ
- **O raio padrão é 5 km?** Sim, configurável até 8 km por bairro.
- **A aprovação é manual?** Sim, inicialmente; automação depois.
- **O modelo de receita é fixo ou percentual?** Híbrido, conforme persona e maturidade.
EOF
echo "docs created"