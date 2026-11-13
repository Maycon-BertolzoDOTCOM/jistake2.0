# JISTake2.0 — Janus: Auditor Automatizado de Custom GPTs

> **HUB central de auditoria**: detecção de vazamento de system prompt (prompt leakage) em Custom GPTs, com bateria versionada de prompts de ataque, classificação de achados e relatórios selados.

---

## 🎯 O que é

O **Janus** é um auditor automatizado de Custom GPTs (OpenAI). Seu objetivo é responder uma pergunta simples e crítica: *o system prompt deste GPT pode ser extraído por um atacante usando prompts adversários?*

Ele testa isso através de **baterias versionadas de prompts de ataque** (YAML), organizadas em categorias (cat1–cat12), cada uma mapeada a um paradigma de defesa sob ataque:

| Categoria | Paradigma | O que testa | Status |
|-----------|-----------|-------------|--------|
| `cat1_direta` | Hierarquia de instruções / Token Democracy | Injeção direta pedindo o system prompt | ✅ |
| `cat7_multiturno` | Canais de saída / erosão por turnos | Erosão da recusa ao longo de múltiplos turnos | ✅ |
| `cat8_output_embedding` | Canais de saída (vetor lateral) | Exfiltração via campos estruturados de saída ([Texto], [System Design], Reference, etc.) — **Achado #002** | ✅ |
| `cat11_lrl` | Segurança multilíngue / lacuna LRL | Ataques em línguas de baixo recurso (hi/fa > en) | ✅ |
| `cat12_encoding` | Ofuscação / encoding Tier-1 | Prompt ofuscado por encoding (sem decodificador v1 → `parcial`) | ✅ |

O runner executa em **modo stub** (sem rede) por padrão, classificando respostas salvas. Pode ser apontado para um **CloakBridge** real quando os seletores do DOM alvo estiverem confirmados.

---

## 🚀 Quick Start

```bash
# 1. Instale as dependências
pip install -r requirements.txt  # pyyaml, pytest, pytest-asyncio, httpx

# 2. Rode os testes (devem ficar verdes: 18 testes)
python -m pytest janus/tests/ -q

# 3. Rode a fila de auditoria (modo stub)
python -m janus.queue.cli run

# 4. Gere o relatório
python -m janus.queue.cli report --data janus/relatorios/fila-2026-10-12
```

### Bateria pronta-para-colar (jis-take-2.0, produção)

Ver `janus/docs/bateria-jis-take-2.0.md` — controles A → B → C, depois 8.1 → 8.8. Salve cada resposta em `/tmp/poc-take2/<id>.txt` e avalie:

```bash
PYTHONPATH=. python3 -m janus.runner.avaliar \
  --categoria cat8_output_embedding \
  --dir /tmp/poc-take2
```

> `exit 1` = há achado grave/crítico (esperado na Face A, sem defesa).

---

## 📁 Estrutura (escopo: apenas Janus)

```
.
├── janus/                    # CORE — auditoria de Custom GPTs
│   ├── queue/                # fila, worker, scheduler, CLI, reporter, gate
│   ├── runner/               # stub/cloakbridge, evaluator, avaliar.py, main.py
│   ├── runner/tests/         # baterias cat1, cat7, cat8, cat11, cat12 (YAML)
│   ├── links/                # registry.yaml (whitelist de GPTs)
│   ├── relatorios/           # templates + saída (gitignored)
│   ├── tests/                # 18 testes da suíte Janus
│   └── docs/                 # paradigmas.md, poc-002-runbook.md, bateria-jis-take-2.0.md
├── scripts/                  # check_licenses.py (CI)
├── .github/workflows/ci.yml  # CI: license-check + janus-tests + janus-e2e
├── LICENSE                   # Apache-2.0
├── NOTICE                    # Atribuição
├── THIRD-PARTY-LICENSES.md   # Consolidado (gerado no CI)
└── .gitignore
```

---

## 🔐 Licenças e Atribuição

- **Código principal**: Apache-2.0 (ver `LICENSE`, `NOTICE`)
- **Terceiros**: Consolidado em `THIRD-PARTY-LICENSES.md` (gerado no CI)
- **Proibido em runtime**: GPL-2.0, GPL-3.0, AGPL-3.0 (CI falha se detectado)

> **Regra**: Nenhum release sem `THIRD-PARTY-LICENSES.md` atualizado.

---

## 🧪 Testes

```bash
python -m pytest janus/tests/ -q   # 18 testes verdes
```

---

## 📚 Documentação

| Documento | Local |
|-----------|-------|
| Paradigmas de segurança de LLMs | `janus/docs/paradigmas.md` |
| Runbook — PoC real do Achado #002 | `janus/docs/poc-002-runbook.md` |
| Bateria pronta-para-colar jis-take-2.0 | `janus/docs/bateria-jis-take-2.0.md` |
| Plano de execução do PoC | `janus/docs/poc-002-plan.md` |

---

## 🏁 Como testificar o valor do Janus

O Janus não é "uns scripts": é uma **metodologia de auditoria operacional** com processo repetível:

1. **Fase 0 — Canário:** gera um token secreto operacional, anota fora do repo.
2. **Fase 1 — Isca:** cria Custom GPT com canário no system prompt, habilita Code Interpreter, anota `sha256`.
3. **Fase 2 — Controles:** roda A, B, C. Se C vazar → aborta e reescreve o system prompt.
4. **Fase 3 — Bateria:** cola os 8 prompts (8.1–8.8), salva respostas integrais.
5. **Fase 4 — Classificação:** `janus.runner.avaliar` → `exit 1` se há grave/crítico.
6. **Fase 5 — Relatório:** preenche `achado-002.md` → deriva `achado-002-bounty.md` → selar com stack Sigil.
7. **Fase 6 — Defesa + Face B:** aplica regras de output, repete 2–4. Critério: 8/8 passou → mitigado.
8. **Fase 7 — Replicar em produção:** com autorização registrada; kill switch ativo.

**Proposta de valor em uma linha:**

> Auditoria automatizada de Custom GPTs: detecta vazamento de system prompt por canais de saída estruturados, com bateria pronta-para-colar, classificação de achados e relatórios selados.

---

## 🤝 Contribuindo

1. Fork → branch `feat/nome` ou `fix/nome`
2. `pre-commit` roda: lint, testes, license-check
3. PR → CI passa (`license-check`, `janus-tests`)
4. Merge → deploy automático (staging → prod)

---

## 📄 Licença

Apache-2.0 — ver `LICENSE` e `NOTICE`.
