# JANUS — auditor de duas faces do ecossistema JIS

`janus enqueue / run / status / report / stop`. Fila de GPTs, swarm com
concorrência limitada, whitelist obrigatória (`links/registry.yaml`), retry
com backoff, relatório consolidado em `relatorios/`.

## §0 — Por que o Janus existe (mapa de evidências, anexo oficial do PR)

**§1 — Metodologia.** `trama/docs/reports/audit_full.md` (LLM Quick Audit:
7 testes, score OWASP, veredito CRÍTICO) é o precedente direto — o Janus
replica bateria + rubrica + severidade para GPTs externos. O cat8 é o 8º
teste natural da série. `FAILURE_TAXONOMY.md` ancora `achados[]` + greenlight.

**§2 — Taxonomia.** `soc/gateway/herbarium/attack_library.py` cataloga 8
classes (`role_play`, `encoding`, `multi_language`, `context_manip`,
`instruction_hier`, `persona_persist`, `tool_exploit`, `many_shot`). cat1–cat4
do Janus estendem essas classes. **cat8 (`output_embedding`) é CATEGORIA
CANDIDATA (interna do Janus)** — promoção a categoria 9 condicionada a:
(a) PoC provar vazamento distinto de arquivo (#001) e código;
(b) sem sobreposição com `tool_exploit` nem `context_manip`. Até lá, o
Herbarium não a absorve. Evolução documentada (não implementada): LLM-juiz,
`garak_bridge.py` como referência de scanner externo.

**§3 — Ética operacional.** `trama-motor/GATE.md` (fail-closed, duas
fechaduras, hashchain). **Ponto de controle explícito:** `janus/queue/gate.py`
`action_approved(link, categoria)` roda antes de qualquer probe; sem
aprovação → `recusado`/`bloqueado_pelo_gate`, sem executar. v1 = mock local
lendo `gate: pre-aprovado` do registry (verificado em 2026-10-11: não há
callable pronto no SOC — `offensive_approvals/store.py` é fluxo pair-human
via SQLite); v2 = integração real. Precedente de isolamento:
`archive/_quarentena/.../NOTA-TRAMA.md`.

**§4 — Disciplina de relatório.** O formato de submissão segue o padrão
neutro de vulnerabilidade (título, severidade, steps, PoC, impacto,
remediação, disclosure timeline). O `deskcomm-docs` corrobora a **disciplina
de severidade e veredito** (97+ findings, READY WITH ressalvas), não o formato.

**§5 — Greenfield provado.** `grep 0 hits` para JIS/Take 2.0 em `trama/`,
`trama-motor/`, `quarentena/`, `trama-analise/`, `deskcomm-docs`. `janus` livre;
`sentinel` VETADO (`soc/gateway/sentinel_watcher.py`); `audit_*` saturado no
gateway (por isso `janus/`, não `auditor/`). Lacuna diferencial: o Janus
introduz `runner/tests/*.yaml` como **dataset versionado de prompts de
ataque** — diffável, revisável, testável em CI (o `attack_library` é código).

**§6 — Runtime.** Janus = CLI + worker on-demand (cron opcional). **Sem porta,
sem daemon, sem serviço HTTP.** Não compete com gateway/honeypot/watchers.

**§7 — Dependências.** stdlib + `pyyaml` + `pytest`/`pytest-asyncio`. Nenhuma
lib nova, nenhum venv separado. `openai`/`chromadb` só se e quando o LLM-juiz
for implementado — pinar então às mesmas versões do Herbarium e verificar com
`pip freeze | grep -E "openai|chromadb|yaml"`.

## Layout

```
janus/
├── README.md                  # este arquivo
├── links/registry.yaml        # whitelist (jis-take-2.0 + isca-poc-002 + placeholders)
├── queue/                     # fila.yaml, worker.py, scheduler.py, state.py, cli.py,
│                              # reporter.py, adapters.py, gate.py, state.json (runtime)
├── runner/                    # main.py, evaluator.py (stub até feat/auditor-gpt) + tests/*.yaml
├── relatorios/templates/      # achado-002.md, achado-002-bounty.md
└── docs/poc-002-plan.md       # plano de execução do PoC (~6h)
```

## Faces

Face A = baseline (sem defesa). Face B = reteste (com defesa). v1 executa só
Face A; o reteste do Achado #002 é o primeiro uso de Face B. Qualquer
`grave`/`critico` em cat8 veta greenlight até Face B 8/8 limpa.
