# Contrato de entrada — `capacity-ledger` (proposta, não implementada)

> **Status: proposta para revisão. Nada foi implementado.**
> Fixture de exemplo é **sintética**, não representa profissionais reais.

## 1. Diagnóstico: campos exigidos pelos consumidores reais

Levantado do código, não de suposição.

### `ProviderCapacity` — consumido por

| Campo | Lido por | Vazio faz o quê |
|---|---|---|
| `providerId` | `matching.ts` | identidade do par |
| `serviceIds` | `criteria.ts` (service-match), `readiness.ts` (densidade) | sem serviço, nunca casa |
| `location` | `matching.ts`, `readiness.ts`, `criteria.ts` (via `distanceKm`) | sem coordenadas, raio não é verificável |
| `serviceRadiusKm` | `criteria.ts` (provider-reach), `readiness.ts` | alcance nunca verificável |
| `windows` | `criteria.ts` (window-overlap) | sem janela, nunca casa |
| `accepting` | `criteria.ts` (accepting), `readiness.ts` | **bloqueia a correspondência** |
| `confirmed` | `criteria.ts` (confirmed), `readiness.ts` | **bloqueia a correspondência** |
| `weeklyCapacity` | **ninguém** | inerte no motor |
| `updatedAt` | **ninguém** | inerte no motor |

> **Risco semântico:** `weeklyCapacity` e `updatedAt` existem no contrato e não são
> consumidos. O ledger **não deve** torná-los obrigatórios, senão cobra dado que
> não produz efeito. Ficam opcionais e sem uso, com aviso.

### `ServiceRequest` — consumido por

| Campo | Obrigatório? | Nota |
|---|---|---|
| `id` | sim | identidade |
| `origin` | sim | `"referral"` \| `"radar"`; radar é bloqueado na Fase 7 |
| `requesterId` | sim | quem não pôde atender |
| `serviceId` | sim | precisa existir em `services` |
| `location` | **condicional** | sem coordenada → modo regional ou bloqueio |
| `radiusKm` | sim | parâmetro, não valor fixo |
| `window` | sim | exige duração; sem ela não há janela |
| `urgency` | sim | `low`\|`normal`\|`high` |
| `consent` | **sim** | `"pending"`/`"denied"` **bloqueiam** o encaminhamento |
| `budgetMin`/`Max` | opcional | sem eles, `price-band` passa |
| `createdAt`, `expiresAt` | sim | ISO 8601 UTC |

### `Handoff` — só se o ledger incluir histórico

`id`, `requestId`, `providerId`, `status`, `clientDecision?`, `providerDecision?`, `updatedAt`.

## 2. Cardinalidade: por que 5 arquivos, não 1

| Dado | Cardinalidade por prestador | Motivo |
|---|---|---|
| identificação, alcance, aceite, confirmação | 1 | um registro |
| serviço + duração | **N** | profissional oferece vários |
| janela de atendimento | **N** | vários horários |
| solicitação | 1 por linha | uma demanda |
| encaminhamento | 1 por par (solicitação, prestadora) | par é a chave |

Um único CSV duplicaria o prestador a cada serviço e janela. **Quatro arquivos.**

```
infra/capacity-ledger/
  data/
    providers.csv
    services.csv
    availability.csv
    requests.csv
    handoffs.csv      # opcional
```

## 2.1 Proveniência por registro

`"synthetic": true` no topo do relatório **não basta**: com um prestador real e
dois fictícios, a flag global mente. A proveniência é **por registro**.

| Estado | Significado | Elegível para o piloto real |
|---|---|---|
| `synthetic` | fixture de teste | ❌ nunca |
| `declared` | informado pelo prestador, não verificado | ⚠️ aceitável em campo que não exige verificação |
| `verified` | verificado conforme critério documentado | ✅ naquele campo |
| `expired` | passou da validade, precisa revalidação | ❌ |

**Ressalva crítica:** `verified` é **por campo**, não por registro. A
identidade pode estar verificada enquanto a disponibilidade está vencida. Um
registro pode ter `identity: verified` e `availability: expired`.

`confirmed: true` **não** decorre de uma etiqueta genérica de proveniência.
Exige o critério operacional definido no contrato para aquele prestador.

### Evidência que autoriza cada estado

| Dado | `declared` exige | `verified` exige | Validade |
|---|---|---|---|
| identidade | contato fornecido | contato confirmado | sem expiração |
| localização | bairro declarado pela profissional | coordenada coletada e conferida | revalidar a cada 90 dias |
| serviços | lista informada | lista conferida na conversa | revalidar a cada 30 dias |
| disponibilidade | janelas declaradas | disponibilidade confirmada na conversa | **7 dias** |
| aceite | `accepting: true` declarado | aceite confirmado na conversa | **7 dias** |

Janela de disponibilidade e aceite expiram rápido porque envelhecem mais
rápido. Identidade e localização quase não mudam.

### Regra de vencimento

Registro vencido **não entra como capacidade válida**. O adaptador marca a
lacuna, o relatório conta e o gate de prontidão enxerga.

## 2.2 `updatedAt` não é `verifiedAt`

| Campo | Serve para | Não prova |
|---|---|---|
| `updated_at` | auditoria: quando a linha foi gravada | que a agenda foi confirmada |
| `verified_at` | validade: quando alguém conferiu | que ainda vale hoje |

`updatedAt` no `capacity-engine` é **inerte** — nenhum consumidor o lê
(`grep updatedAt core/capacity-engine/src` → vazio). Isso **não** demonstra
insuficiência contratual: o campo é legível e o motor pode continuar genérico.
O filtro de validade pertence **à camada de entrada**, não ao motor.

Só se, após o piloto, o motor não conseguir representar a distinção necessária
ao matching é que se demonstra insuficiência e se altera o núcleo.

## 2.3 IDs opacos e separação de contatos

No piloto não existe `contacts.csv`. A separação é **regra**, não arquivo.

```
prestadores.csv   provider_ref (opaco)  — sem nome, sem telefone
solicitações.csv  client_ref  (opaco)  — sem nome, sem telefone
```

Nome e telefone ficam em registro separado, com acesso restrito, gerenciado no
procedimento operacional. O motor **nunca** recebe PII desnecessária.

Contato da cliente só é compartilhado com a profissional indicada **mediante
autorização da cliente**, registrada antes do encaminhamento.

Quando o fluxo precisar importar e exportar contatos automaticamente,
`contacts.csv` nasce com controles de acesso e retenção próprios.

## 3. Esquema dos arquivos

Convenção: vazio = ausente. `null` nunca. Nada de `0` como substituto de "não sei".

### 3.1 `providers.csv`

| Coluna | Tipo | Obrig. | Destino | Validação |
|---|---|---|---|---|
| `provider_id` | string | **sim** | `providerId` | **ID opaco.** Sem nome, sem telefone |
| `lat` | number \| vazio | cond. | `location.point.lat` | vazio **ou** −90..90; fora → erro |
| `lng` | number \| vazio | cond. | `location.point.lng` | vazio **ou** −180..180; fora → erro |
| `neighborhood` | string \| vazio | cond. | `location.neighborhood` | preenchido se sem coordenada |
| `city` | string \| vazio | cond. | `location.city` | exigido se `neighborhood` |
| `state` | string \| vazio | cond. | `location.state` | exigido se `neighborhood` |
| `address` | string \| vazio | não | preservado, nunca convertido | sem PII además do necessário |
| `reach_km` | number \| vazio | não | `serviceRadiusKm` | 0 < x ≤ `BEAUTY_MAX_RADIUS_KM` (8) |
| `accepting` | `true`\|`false` | **sim** | `accepting` | ausente → erro. Vence em 7 dias |
| `confirmed` | `true`\|`false` | **sim** | `confirmed` | ausente → erro. Vence em 7 dias |
| `weekly_capacity` | number \| vazio | não | `weeklyCapacity` | aviso: campo não consumido |
| `updated_at` | ISO 8601 \| vazio | não | `updatedAt` | auditoria; **não** prova validade |
| `identity_provenance` | `declared`\|`verified` | **sim** | proveniência | nunca `synthetic` no piloto |
| `location_provenance` | `synthetic`\|`declared`\|`verified`\|`expired` | **sim** | proveniência | por campo, não por registro |
| `services_provenance` | `synthetic`\|`declared`\|`verified`\|`expired` | **sim** | proveniência | vence em 30 dias |
| `availability_provenance` | `synthetic`\|`declared`\|`verified`\|`expired` | **sim** | proveniência | vence em 7 dias |
| `acceptance_provenance` | `synthetic`\|`declared`\|`verified`\|`expired` | **sim** | proveniência | vence em 7 dias |
| `verified_at` | ISO 8601 UTC | cond. | validade | exigido quando alguma proveniência = `verified` |
| `location_valid_until` | ISO 8601 UTC \| vazio | não | validade | padrão: `verified_at` + 90 dias |
| `availability_valid_until` | ISO 8601 UTC \| vazio | não | validade | padrão: `verified_at` + 7 dias |
| `acceptance_valid_until` | ISO 8601 UTC \| vazio | não | validade | padrão: `verified_at` + 7 dias |

**Regra de precedência de localização:** se `lat` **e** `lng` presentes → `coordinates`. Se só um → **erro** (parcial). Se nenhum e `neighborhood` presente → `neighborhood`. Se nada → `unknown` + lacuna.

### 3.2 `services.csv`

| Coluna | Tipo | Obrig. | Nota |
|---|---|---|---|
| `provider_id` | string | **sim** | FK |
| `service_id` | string | **sim** | identidade do serviço |
| `duration_minutes` | number | **sim** | sem isso não há janela de atendimento |
| `price` | number \| vazio | não | base do `price-band` |

### 3.3 `availability.csv`

| Coluna | Tipo | Obrig. | Nota |
|---|---|---|---|
| `provider_id` | string | **sim** | FK |
| `start` | ISO 8601 UTC | **sim** | |
| `end` | ISO 8601 UTC | **sim** | **`end > start`**; duração zero → erro |

Janela de duração zero é rejeitada, não convertida.

### 3.4 `requests.csv`

| Coluna | Tipo | Obrig. | Nota |
|---|---|---|---|
| `request_id` | string | **sim** | |
| `origin` | `referral`\|`radar` | **sim** | `radar` aceito no contrato, sem implementação |
| `requester_id` | string | **sim** | `provider_ref` opaco |
| `client_ref` | string | **sim** | **ID opaco.** Sem PII |
| `service_id` | string | **sim** | precisa existir em `services` |
| `lat` / `lng` | number \| vazio | cond. | mesma precedência |
| `neighborhood` / `city` / `state` | string \| vazio | cond. | |
| `radius_km` | number | **sim** | > 0 |
| `start` / `end` | ISO 8601 UTC | **sim** | `end > start` |
| `urgency` | `low`\|`normal`\|`high` | **sim** | |
| `consent` | `granted`\|`pending`\|`denied` | **sim** | `pending`/`denied` bloqueiam |
| `budget_min` / `budget_max` | number \| vazio | não | ordem validada |
| `created_at` | ISO 8601 UTC | **sim** | |
| `expires_at` | ISO 8601 UTC | **sim** | > `created_at` |

`client_ref` é **opaco**. **Sem nome, telefone ou e-mail.** O ledger registra
solicitação, não pessoa. Consentimento é um booleano operacional.

**Sem nome, telefone ou e-mail da cliente.** O ledger registra solicitação, não pessoa. Consentimento é um booleano operacional.

### 3.5 `handoffs.csv` (opcional)

| Coluna | Tipo | Obrig. |
|---|---|---|
| `handoff_id` | string | **sim** |
| `request_id` | string | **sim** |
| `provider_id` | string | **sim** |
| `status` | um de `HandoffStatus` | **sim** |
| `client_decision` | `accepted`\|`declined`\|vazio | não |
| `client_decided_at` | ISO 8601 \| vazio | condicional |
| `provider_decision` | `accepted`\|`declined`\|vazio | não |
| `provider_decided_at` | ISO 8601 \| vazio | condicional |
| `updated_at` | ISO 8601 UTC | **sim** |

Par `(request_id, provider_id)` único — evita dupla contagem, como já corrigido em `beauty:aprovar`.

## 4. Exemplo sintético (2º a 4º arquivo omitidos por brevidade)

```csv
schema_version,generated_at
1,2026-03-02T09:00:00Z
```

```csv
# providers.csv — DADOS SINTETICOS. Nao representa profissionais reais.
provider_id,lat,lng,neighborhood,city,state,address,reach_km,accepting,confirmed,identity_provenance,location_provenance,services_provenance,availability_provenance,acceptance_provenance,verified_at,availability_valid_until,acceptance_valid_until
sint-p1,-23.5510,-46.6340,,,,,,8,true,true,synthetic,synthetic,synthetic,synthetic,synthetic,2026-03-02T09:00:00Z,2026-03-09T09:00:00Z,2026-03-09T09:00:00Z
sint-p2,-23.5520,-46.6350,,,,,,8,true,true,synthetic,synthetic,synthetic,synthetic,synthetic,2026-03-02T09:00:00Z,2026-03-09T09:00:00Z,2026-03-09T09:00:00Z
sint-p3,,,,Vila Sintetica,Sao Paulo,SP,,5,true,true,synthetic,declared,synthetic,synthetic,synthetic,,
```

`sint-p3` sem coordenada mas com bairro: entra como `neighborhood`, **não**
vira `coordinates` nem `unknown`. `location_provenance: declared` porque bairro
foi informado, não verificado.

Como `availability_provenance` é `synthetic`, **nenhum** dos três é elegível
para o piloto real. Eveno que os campos existam, o relatório marca
`eligibleForPilot: false`.

## 4.1 Versão de esquema e idempotência

Todo arquivo começa com um preâmbulo:

```csv
schema_version,generated_at
1,2026-03-02T09:00:00Z
```

Reimportar o mesmo arquivo **não pode duplicar** prestador nem solicitação.

| Situação | Ação | Código |
|---|---|---|
| `provider_id` existe e o registro novo é **mais recente** | substitui | — |
| `provider_id` existe e o registro novo é **mais antigo** | conserva o atual | `W_STALE_ROW` |
| `provider_id` existe e o registro novo tem menos proveniência | conserva o atual | `W_PROVENANCE_REGRESSION` |
| `(request_id, provider_id)` repetido em `handoffs.csv` | conserva o primeiro desfecho | `W_DUPLICATE_HANDOFF` |
| `schema_version` maior que a suportada | **rejeita o arquivo** | `E_SCHEMA_VERSION` |

A regra de proveniência é a mais importante: **reimportar um backup antigo não
pode rebaixar um prestador que já foi verificado.**

## 5. Regras de validação

### Erro — registro **rejeitado** (não entra em nenhum cálculo)

| Código | Condição |
|---|---|
| `E_MISSING_FIELD` | coluna obrigatória vazia ou ausente |
| `E_BAD_BOOL` | `accepting`/`confirmed`/`consent` fora do enum |
| `E_COORD_RANGE` | `lat` fora de −90..90 ou `lng` fora de −180..180 |
| `E_COORD_PARTIAL` | só um de `lat`/`lng` presente |
| `E_COORD_NAN` | `NaN`, `Infinity`, texto |
| `E_ZERO_WINDOW` | `end <= start` |
| `E_BAD_ENUM` | valor fora de `origin`/`urgency`/`status` |
| `E_BAD_DATE` | data não ISO 8601 ou sem timezone |
| `E_DATE_ORDER` | `expires_at <= created_at` |
| `E_BUDGET_ORDER` | `budget_min > budget_max` |
| `E_RANGE` | `reach_km <= 0` ou acima do máximo da vertical |
| `E_DUPLICATE` | `provider_id` repetido, ou par de handoff repetido |
| `E_SCHEMA_VERSION` | `schema_version` acima do suportado |
| `E_BAD_PROVENANCE` | valor fora do enum de proveniência |
| `E_MISSING_VERIFIED_AT` | proveniência `verified` sem `verified_at` (erro, não aviso, quando crítico) |
| `E_FK` | `provider_id`/`service_id` inexistente |

Coordenada inválida é **erro**, não downgrade para bairro. Dado corrompido não vira um modo de localização declarado diferente.

### Aviso — registro **conservado incompleto** para diagnóstico

| Código | Condição |
|---|---|
| `W_NO_LOCATION` | sem coordenada e sem bairro → `unknown` + lacuna |
| `W_REGIONAL_ONLY` | só região declarada; não sustenta raio |
| `W_NO_REGION_CITY` | bairro sem cidade → comparação regional bloqueada |
| `W_NOT_ACCEPTING` | `accepting=false` → nunca casa |
| `W_NOT_CONFIRMED` | `confirmed=false` → nunca casa |
| `W_CONSENT_MISSING` | consentimento não concedido → encaminhamento bloqueado |
| `W_UNCONSUMED_FIELD` | `weekly_capacity`/`updated_at` preenchidos e não usados |
| `W_NO_HISTORY` | sem `handoffs.csv` → concluídos = 0 |
| `W_STALE_ROW` | linha mais antiga que a existente foi descartada |
| `W_PROVENANCE_REGRESSION` | reimportação tentou rebaixar a proveniência |
| `W_SYNTHETIC_NOT_ELIGIBLE` | registro `synthetic` presente; inelegível para o piloto |
| `W_AVAILABILITY_EXPIRED` | `availability_valid_until` no passado → não é capacidade válida |
| `W_ACCEPTANCE_EXPIRED` | `acceptance_valid_until` no passado → não casa |
| `W_LOCATION_EXPIRED` | `location_valid_until` no passado |
| `W_VERIFIED_WITHOUT_DATE` | proveniência `verified` sem `verified_at` → rebaixada a `declared` |
| `W_DECLARED_FOR_CONFIRMED` | `confirmed: true` sem proveniência `verified` → aceito, mas marcado |

### Conversões proibidas

| Origem | Destino proibido |
|---|---|
| coordenada ausente | `lat=0`, `lng=0` |
| endereço textual | coordenada |
| bairro | coordenada |
| coordenada inválida | bairro, ou `unknown` silencioso |
| `reach_km` | substituto de `location` |
| ausência de dado | `false`, `0` ou `""` |

## 6. Formato JSON de saída

```jsonc
{
  "$schema": "hub.capacity-ledger/report/v1",
  "synthetic": true,              // fixtures são sintéticos
  "generatedAt": "2026-03-02T12:00:00Z",

  "schemaVersion": 1,

  "ingestion": {
    "providers": { "read": 3, "accepted": 3, "rejected": 0, "incomplete": 1 },
    "services":  { "read": 3, "accepted": 3, "rejected": 0, "incomplete": 0 },
    "requests":  { "read": 1, "accepted": 1, "rejected": 0, "incomplete": 0 },
    "handoffs":  { "read": 0, "accepted": 0, "rejected": 0, "incomplete": 0 }
  },

  "provenance": {
    "synthetic": 3,
    "declared":  1,
    "verified":  0,
    "expired":   0,
    "perField": {
      "identity":    { "verified": 0, "declared": 0, "expired": 0 },
      "location":    { "verified": 0, "declared": 1, "expired": 0 },
      "services":    { "verified": 0, "declared": 0, "expired": 0 },
      "availability":{ "verified": 0, "declared": 0, "expired": 0 },
      "acceptance":  { "verified": 0, "declared": 0, "expired": 0 }
    },
    "note": "proveniencia e por campo: identidade verificada nao implica disponibilidade valida"
  },

  "eligibility": {
    "eligibleForPilot": false,
    "reason": "Nenhum prestador tem proveniencia 'verified' em disponibilidade e aceite.",
    "syntheticExcluded": 3,
    "expiredExcluded": 0
  },

  "freshness": {
    "staleAvailability": 0,
    "staleAcceptance": 0,
    "staleLocation": 0,
    "oldestRecordAgeDays": 0,
    "referenceTime": "2026-03-02T12:00:00Z"
  },

  "errors":   [ { "code": "E_COORD_RANGE", "file": "providers.csv", "line": 4, "field": "lat" } ],
  "warnings": [ { "code": "W_REGIONAL_ONLY", "file": "providers.csv", "line": 4, "detail": "..." } ],

  "location": {
    "requests":     { "withCoordinates": 1, "regionalOnly": 0, "unknown": 0 },
    "providers":    { "withCoordinates": 2, "regionalOnly": 1, "unknown": 0 },
    "noDoubleCount": true
  },

  "matching": {
    "geographicVerified": 2,
    "regionalApproximate": 1,
    "inconclusive": 0,
    "blockedConfirmed": 0,
    "blockedForMissingData": 0
  },

  "capacityMetrics": {
    "requestsReceived": 1,
    "requestsUnfulfilled": 1,
    "matchesProposed": 2,
    "handoffsOffered": 0,
    "handoffsClientAccepted": 0,
    "handoffsProviderConfirmed": 0,
    "handoffsCompleted": 0,
    "handoffsDeclined": 0,
    "potentialRecoverable": 2,
    "matchableCount": 2,
    "completedCount": 0
  },

  "readiness": {
    "operationalReady": true,
    "regionalCapable": true,
    "geographicallyVerifiable": true,
    "status": "not-ready",
    "unmet": ["recordedRequests 1 < 10", "completedHandoffs 0 < 1"]
  },

  "privacy": {
    "piiFieldsPresent": false,
    "contactSeparation": "provider_ref e client_ref opacos; contato em registro separado",
    "consentRequired": true
  },

  "invariants": {
    "completedLeMatchable": true,
    "matchableLePotential": true,
    "regionalNotCountedAsGeographic": true,
    "eligibleImpliesVerified": true
  }
}
```

**Separações obrigatórias:**

1. `matching.geographicVerified` e `matching.regionalApproximate` **nunca** somam em `matchableCount`.
2. `blockedConfirmed` e `blockedForMissingData` são **disjuntos**.
3. `eligibility.eligibleForPilot` é `false` se qualquer prestador usado for `synthetic` ou `expired`.
4. `provenance.perField` separa identidade de disponibilidade: `identity.verified: 3` com `availability.expired: 3` **é um estado possível e honesto**.
5. `synthetic: true` no topo é informativo. A decisão real é `eligibility.eligibleForPilot`.

## 7. Mapeamento campo → consumidor

| Campo | Consumidor | Uso |
|---|---|---|
| `provider_id` | `matching.ts` | identidade |
| `lat`/`lng` | `geo.ts: tryHaversineKm` | `distanceKm` ou `null` |
| `neighborhood`/`city`/`state` | `location.ts: sameNeighborhood` | comparação regional |
| `reach_km` | `criteria.ts: provider-reach`, `readiness.ts` | alcance |
| `accepting` | `criteria.ts: accepting` | **bloqueia** |
| `confirmed` | `criteria.ts: confirmed` | **bloqueia** |
| `service_id` | `criteria.ts: service-match` | compatibilidade |
| `duration_minutes` | adaptador → `window` | duração |
| `start`/`end` | `criteria.ts: window-overlap` | sobreposição |
| `consent` | `criteria.ts: consent` | **bloqueia** |
| `radius_km` | `criteria.ts: radius` | raio pedido |
| `weekly_capacity` | **nenhum** | inerte |
| `updated_at` | **nenhum** | inerte |

## 8. Testes previstos

**Importação:** campo obrigatório ausente · bool inválido · `lat`/`lng` fora de range · coordenada parcial · `NaN`/texto · janela de duração zero · FK inexistente · duplicata · par de handoff repetido · ordem de budget/datas · `schema_version` acima do suportado · proveniência fora do enum.

**Proveniência e validade:** sintético nunca elegível · `verified` sem `verified_at` rebaixa a `declared` · disponibilidade vencida não casa · aceite vencido não casa · reimportação mais antiga gera `W_STALE_ROW` · reimportação não rebaixa proveniência · identidade verificada com disponibilidade vencida é estado válido.

**Idempotência:** reimportar o mesmo arquivo não duplica · par de handoff repetido conserva o primeiro desfecho · linha mais recente substitui a antiga.

**Semântica:** coordenada ausente → `null`, nunca `0` · endereço nunca convertido · bairro homônimo em cidades distintas · região sem cidade → bloqueada · consentimento `pending` bloqueia · `accepting=false` nunca casa.

**Contadores:** sem dupla contagem nas três categorias · soma igual ao total · regional separado de geográfica.

**Invariantes:** `completed ≤ matchable ≤ potential` · `computeCapacityMetrics` lança se violado.

**Relatório:** rejeitados não entram em cálculo · incompletos conservados com aviso · erros e avisos com `file`/`line`/`field`.

## 9. Decisões fechadas

| # | Decisão | Escolha |
|---|---|---|
| 1 | Local do ledger | `infra/capacity-ledger/` — `infra/` já é workspace |
| 2 | `origin: radar` | Aceitar com `W_RADAR_NOT_IMPLEMENTED`; **não** contorna gates |
| 3 | `handoffs.csv` no 1º corte | **Sim** — sem ele `completedCount` é sempre 0 |
| 4 | Datas | **Exigir** UTC terminado em `Z`; rejeitar offset, sem conversão silenciosa |
| 5 | CI antes do ledger | **Sim**, commit separado (`7aa9207`) |
| 6 | Proveniência | No ADR-004; 4 estados, **por campo** |
| 7 | Staleness | `verifiedAt` + validade na camada de entrada; motor inalterado |
| 8 | Contatos | Sem `contacts.csv` agora; separação por `provider_ref`/`client_ref` opacos |

## 10. O que falta antes de implementar

**A coleta manual real.** Este contrato está desenhado contra hipótese. Três a
cinco profissionais voluntárias vão revelar campos que não previmos, e o
contrato deve ser revisado contra a realidade da coleta antes de virar parser.

Sequência: coleta manual → contrato revisado → parser → ensaio E2E sintético
para cenários que o piloto ainda não cobriu.

## 11. Limites permanentes

- Sem API paga de geocodificação
- Sem scraping, sem radar, sem mapas
- Sem automação de decisão no piloto: encaminhamento é humano
- Sem PII nos arquivos de matching
- Sem compartilhamento de contato sem autorização da cliente
- `capacity-engine` só muda com insuficiência contratual **demonstrada**
