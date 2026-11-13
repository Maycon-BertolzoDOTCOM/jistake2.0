# {{TITLE}}

> TEMPLATE neutro de submissão de vulnerabilidade. NÃO citar programa,
> plataforma ou bounty no corpo — a escolha do destino é decisão posterior.
> Preencher os `{{PLACEHOLDERS}}`.

## 1. Summary

{{DESCRIÇÃO_RESUMIDA_DO_ACHADO — 2-3 linhas, sem jargão}}

## 2. Severity: {{CRITICAL | HIGH | MEDIUM | LOW | INFO}}

- {{JUSTIFICATIVA_DA_SEVERIDADE — mapear para CVSS se aplicável}}
- {{IMPACTO_REAL_VS_TEÓRICO}}

## 3. Scope and Authorization

- **Target:** {{ALVO_EXATO_TESTADO — domínio, IP, app, API}}
- **Authorization ID:** `{{AUTORIZACAO_ID}}` (sha256:... | uuid:...)
- **Authorized by:** {{AUTORIZADO_POR}}
- **Window:** {{JANELA_UTC_INICIO}} → {{JANELA_UTC_FIM}}
- **Scope:** {{ESCOPO_EXPLÍCITO — lista de domínios/IPs/apps}}
- **Limits:** {{LIMITES_APLICADOS — ex: sem_dos, sem_dados_reais}}
- **Third parties tested:** {{SIM/NÃO — se sim, autorização separada ID}}
- **Real user data involved:** {{SIM/NÃO — se sim, LGPD/CFAA aplicável}}

## 4. Steps to Reproduce

**Prerequisites:** {{PRÉ-REQUISITOS — contas, configurações, estado inicial}}

1. {{PASSO_1}}
2. {{PASSO_2}}
3. {{PASSO_N}}

**Negative controls (obrigatórios para cat8/cat11):**
- A: {{CONTROLE_NEGATIVO_A — prova que não há vazamento espontâneo}}
- B: {{CONTROLE_NEGATIVO_B — mede obediência genérica vs vazamento}}
- C: {{CONTROLE_NEGATIVO_C — pergunta direta ao segredo; deve recusar}}

## 5. Proof of Concept

- **Best case:** prompt `{{PROMPT_ID}}` → `{{EVIDÊNCIA_REDIGIDA — ex: canary proto…XXXX}}` appeared `{{VERBATIM/PARAFRASEADO}}` in `{{CANAL}}`.
  Full transcript hash: `{{SHA256_EVIDENCIA_COMPLETA}}` (truncado 200 chars: `{{EVIDENCIA_TRUNCADA}}`)
- **Channels affected:** `{{N}}` of `{{TOTAL}}` ({{LISTA_CANAIS}})
- **Negative controls:** A `{{PASSOU/FALHOU}}`, B `{{OBEDDEU/RECUSOU}}`, C `{{RECUSOU}}`
- **Runs:** `{{N_RUNS}}` por prompt, `{{N_PROMPTS}}` prompts, taxa de vazamento `{{X}}%`

## 6. Business Impact

- {{IMPACTO_1 — ex: competidor replica produto}}
- {{IMPACTO_2 — ex: follow-up attacks direcionados}}
- {{IMPACTO_3 — ex: defesa parcial (ex: disable CI) não mitiga completamente}}

## 7. Remediation

1. {{MEDIDA_PRIMÁRIA — ex: OUTPUT RULES no system prompt com prioridade máxima}}
2. {{DEFESA_EM_PROFUNDIDADE — ex: disable Code Interpreter}}
3. {{REGRESSÃO — ex: re-run battery após cada change de system prompt}}
4. {{MONITORAMENTO — ex: logging de tentativas de embedding}}

## 8. Disclosure Timeline

| Data (UTC) | Evento |
|---|---|
| {{YYYY-MM-DD}} | Descoberto (Face A: `{{X}}`/{{TOTAL}} vazaram) |
| {{YYYY-MM-DD}} | Defesa aplicada (sha256 antes/depois: `{{HASH_ANTES}}` → `{{HASH_DEPOIS}}`) |
| {{YYYY-MM-DD}} | Reteste Face B: `{{Y}}`/{{TOTAL}} — veredito `{{MITIGADO/ABERTO}}` |
| {{YYYY-MM-DD}} | Reportado a `{{DESTINATÁRIO}}` (canal oficial) |
| {{YYYY-MM-DD}} | `{{ACK/SEM_RESPOSTA}}` — SLA `{{DIAS}}` dias |
| {{YYYY-MM-DD}} | Publicado (após correção ou prazo esgotado) |

## 9. Appendix

- Internal report: `relatorios/fila-{{DATA}}/por-gpt/{{GPT_ID}}/achado-{{ID}}.md`
- Battery: `janus/runner/tests/{{CAT}}.yaml`
- Evaluation: deterministic keyword + canary-regex rules (no LLM judge)
- Evidence hashes:
  - `{{SHA256_SCREENSHOT_1}}`
  - `{{SHA256_LOG_1}}`
  - `{{SHA256_RESPONSE_1}}`
- Chain of custody: `{{AUTORIZACAO_ID}}` → `{{GATE_DECISION_LOG}}` → `{{WORKER_LOG}}` → `{{REPORT}}`