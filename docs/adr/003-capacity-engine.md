# ADR-003: capacity-engine como núcleo de capacidade disponível

## Status
Aceito — 2026-10-17

## Contexto

O HUB revelou um problema operacional repetido em vários mercados locais: um prestador tem
demanda que não consegue atender, enquanto outro, no mesmo território, tem capacidade
ociosa. O conceito já existia espalhado dentro de `plugins/beauty` — `capacity`,
`overflowFrom`, a ação `beauty:overflow` — mas achatado em
`Entity.metadata: Record<string, unknown>` e em strings de glossário, sem nenhuma
abstração no core. Busca por `Overflow`, `Capacity`, `Demand`, `Partner` como tipos
retornou zero ocorrências em qualquer `core/*`.

Duas fontes de landing coexistem e divergem: `plugins/beauty/src/landing.ts` e
`hub/examples/beauty-landing.json`. O script `scripts/render-beauty.mjs` gera o HTML
publicado a partir do **JSON**. `renderBeautyLanding()` gera um schema diferente.

## Decision

Criar `core/capacity-engine` como domínio puro de capacidade disponível, e tratar a
divergência das duas landings como **pendência de design adiada**, não como bloqueio.

### Fronteira do core

O motor conhece **solicitações, capacidade, compatibilidade, encaminhamento e
métricas**. Não conhece manicure, cabelo, pet ou serviço residencial. Cada vertical
declara seus próprios critérios.

O core:
- é TypeScript puro, `strict` e `noUncheckedIndexedAccess`;
- **não faz I/O**: sem `fs`, `net`, `http`, banco ou `child_process`;
- **não lê relógio nem aleatoriedade** em tempo de import;
- **não depende de nenhum pacote** (`dependencies: {}`);
- **não importa schema de apresentação**: `landing.ts`, `beauty-landing.json`,
  `PageSchema`, `@hub/pageforge` e `@hub/visualforge` são proibidos;
- **não contém vocabulário de vertical** nem valor comercial hardcoded.

Essas invariantes não são convenção: `architecture.test.ts` falha o build se
qualquer uma for violada.

### Números que não podem ser confundidos

`O = min(D_e, C_l)` é **teto teórico**, não resultado. O motor separa três níveis:

| Campo | Significado |
|---|---|
| `potentialRecoverable` | limite teórico por volume |
| `matchableCount` | passou em todos os critérios de compatibilidade |
| `completedCount` | virou `Handoff` concluído |

Invariante testada: `completedCount <= matchableCount <= potentialRecoverable`.
Um relatório que publique só `min(D_e, C_l)` como se fosse receita seria enganoso.

### Métricas de capacidade ≠ funil comercial

`CapacityMetrics` mede o domínio operacional (solicitações, correspondências,
encaminhamentos, conclusões, razões de falha). Entrevistas, adesão ao piloto,
disposição a pagar e renovações **não pertencem a este tipo** — são validação
comercial e ficam na camada de relatório.

### Encaminhamento com duas decisões distintas

`HandoffStatus` é `requested | offered | accepted | declined | completed | expired |
cancelled`. Por trás de `accepted` há **dois atores com decisões separadas**:
`clientDecision` e `providerDecision`. Sem isso não seria possível distinguir
"a cliente aceitou" de "a parceira confirmou disponibilidade" — distinção indispensável
para medir o funil. `complete` exige `providerDecision.decision === "accepted"`.

### Origem da solicitação desde o dia 1

`ServiceRequest.origin: "referral" | "radar"`. O valor `"radar"` existe agora sem
que exista radar. É preparação de contrato, um campo, sem implementar coleta.

## Divergência das landings: decisão explícita

**Adiada para a Fase 5. Não é bloqueio da Fase 1.**

O schema de landing descreve apresentação comercial; o `capacity-engine` descreve
oportunidades e encaminhamentos. São problemas separados. A adaptação entre dados
operacionais e o motor pertence ao **plugin** (Fase 3), nunca ao core.

Riscos aceitos conscientemente:
- o HTML publicado vem do **JSON**, não do `landing.ts` — registrado até a Fase 5;
- os dois schemas divergem em seções (`nail-showcase`, `tabs`, `gallery` só no JSON;
  `quiz` só no TS) — não unificar por remoção de seções diferentes até os arquivos
  parecerem iguais; definir contrato e testar as duas renderizações contra ele;
- inventariar consumidores de `beauty-landing.json`, `render-beauty.mjs`,
  `landing.ts` e `renderBeautyLanding()` **antes** de escolher fonte canônica.

## Consequences

- Adicionar uma vertical passa a ser um plugin com `CapacityCriteriaContribution`,
  sem tocar no core.
- Apagar `core/capacity-engine` e o adaptador do plugin reverte o experimento sem
  afetar `pageforge`, `contentforge` ou os demais pacotes.
- O gate para `core/demand-radar` é operacional, não temporal:
  `assessReadiness()` precisa de densidade compatível, disponibilidade confirmada,
  solicitações reais registradas e ao menos um encaminhamento concluído.
- Uma mudança de layout, preço exibido ou formato de landing não obriga a reescrever
  o motor — desde que ninguém importe schema de apresentação para o core.

## Alternativas rejeitadas

- **Modelar capacidade em `Entity.metadata`**: é onde o conceito estava e não tem
  tipo, não valida e não gera invariante.
- **Colocar os critérios no core**: exigiria `if (service === "manicure")`, violando
  a regra de core agnóstico do `AGENTS.md`.
- **Uma pasta `adapters/` na raiz**: não é workspace (`core/*`, `plugins/*`, `infra/*`),
  ficaria fora de build, lint e test. Adaptadores vão para `infra/` na Fase 4.
- **Zod na fronteira**: nenhum pacote do monorepo usa biblioteca de validação.
  Introduzir agora adiciona dependência a um core que hoje tem `dependencies: {}`.
  O tipo em si é a validação; validação de CSV fica no adaptador da Fase 4.
