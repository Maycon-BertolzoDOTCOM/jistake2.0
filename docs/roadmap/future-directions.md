# Roadmap — Direções adiadas (não implementadas)

> Registro de decisões **adiadas**, não de tarefas. Cada item traz o critério
> objetivo que o libera. Nada aqui deve ser implementado antes do gatilho.

## 1. Megazorde de agentes, tokenizador e radar de novidades

**Adiado em:** 2026-10-17, durante a Fase 4 do `capacity-engine`.

### O que seria

Orquestração de múltiplos agentes com limite de token, custo por execução,
observabilidade e painel de acompanhamento, integrando Pomodoro e timeboxing.

### Ferramenta avaliada

**Super Productivity** (MIT, local-first, ~22k estrelas). Já entrega Pomodoro,
Flowtime, countdown, timeboxing, Kanban, Eisenhower, time tracking e integração
com GitHub/Jira/GitLab. Não oferece orquestração de agentes nem tokenizador.

| Necessidade | Super Productivity |
|---|---|
| Pomodoro e foco | nativo |
| Organizar e planejar | nativo |
| Acompanhar o que é novo | integração GitHub com polling e auto-add |
| Megazorde de agentes | não existe |
| Tokenizador | não existe |

### Gatilho de reavaliação

As duas condições precisam ser **simultaneamente verdadeiras**:

1. existem operações manuais recorrentes com custo estimado > 2h/semana; e
2. existem pelo menos **10 clientes pagantes** ativos.

### Por que foi adiado

Consta da lista de "tecnologias a não adotar agora" do próprio plano
(ADR-003 e diretriz técnica): microserviços, filas distribuídas, Redis,
observabilidade completa. Automatizar antes de provar a demanda inverte a
ordem "validar antes de escalar".

### Antes disso, o barato

Adotar Super Productivity como ferramenta **pessoal** (não produto) tem custo
~1h e retorno imediato. O time tracking revela a razão real de custo do negócio
— quanto cada vertente consome de horas — informação que hoje não existe e que
informa precificação.

---

## 2. Painel administrativo e autenticação

**Gatilho:** necessidade comprovada de login, gestão de páginas e controle de acesso.

Antes disso: fluxo operacional com acesso restrito aos registros é suficiente
para o piloto.

---

## 3. Pagamento e cobrança recorrente

**Gatilho:** demanda real por cobrança automatizada.

Piloto: Pix manual com registro. Sem faturamento dentro do HUB.

---

## 4. `core/demand-radar` — Radar de Demanda Local

**Adiado em:** Fase 3 e reaffirmed na Fase 4.

### Gate operacional (não temporal)

`assessReadiness()` precisa retornar `radar-eligible`, o que exige:

| Condição | Limiar |
|---|---|
| `providersWithCoordinates` | ≥ 3 |
| `confirmedProviders` | ≥ 3 |
| `recordedRequests` | ≥ 10 |
| `completedHandoffs` | ≥ 1 |

**Bairro declarado não substitui coordenada.** A auditoria `d2eca9a` provou
que usar `compatibleProviders` (que inclui regionais) liberava `radar-eligible`
com zero coordenadas.

### Restrições permanentes

- Sem scraping, sem acesso a rede no pacote
- Observação humana no piloto
- Classificação de legitimidade antes de qualificar
- Aprovação humana antes de qualquer abordagem comercial
- Sem armazenamento de nome, telefone, foto ou perfil de quem postou

---

## 5. Novas verticais além de beleza

**Gatilho:** três comprovações em beleza: indicações realizadas, atendimentos
concluídos e profissionais dispostas a pagar.

### Ordem candidata

| Prioridade | Segmento | Motivo |
|---|---|---|
| 1 | Beleza | em validação |
| 2 | Cabelo, barba, cílios, sobrancelhas | maior reaproveitamento de ativos |
| 3 | Pet grooming | agendamento parecido, novos critérios |
| 4 | Fotógrafos e fornecedores de eventos | conflito de agenda e data |
| 5 | Serviços residenciais e oficinas | matching e verificação mais complexos |

Nenhum plugin deve ser criado antes do primeiro. A generalidade do core se
demonstra pela interface `hub.capacity` e pelos testes de contrato, não por
implementação prematura.

---

## 6. Banco de dados

**Gatilho:** operações concorrentes, autenticação, histórico confiável ou dados
de clientes diferentes.

Antes disso: CSV para entrada, JSON para relatório.

Candidato quando chegar: PostgreSQL + Drizzle, com migrações versionadas.

---

## 7. Geocodificação

**Decisão:** não integrar API paga de geocodificação.

Bairro declarado é comparação **regional**, nunca distância calculada. Para o
piloto, a profissional informa a coordenada no próprio cadastro.

---

## Regra que governa esta lista

Nenhum item sai daqui por entusiasmo técnico. Sai quando o gatilho escrito é
atingido, com evidência, e o item passa por revisão antes de gerar commit.
