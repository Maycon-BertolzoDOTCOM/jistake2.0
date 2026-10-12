# Maycon-BertolzoDOTCOM — Ecossistema Unificado

> **HUB central**: Auditoria de GPTs (Janus) + Libertação de Sandbox (escapekit-mcp) + Monitoramento

---

## 🎯 Visão Geral

Este repositório unifica três pilares:

| Componente | Descrição | Status |
|------------|-----------|--------|
| **Janus** | Auditor automatizado de Custom GPTs (baterias cat1–cat12, selagem Sigil, reteste Face B) | ✅ Funcional |
| **escapekit-mcp** | MCP Server que liberta código de sandboxes (AI Studio, Bolt, Replit) → produção | 📝 Licenciado Apache-2.0 |
| **HUB Web** | Portal unificado: login `sk-trama-*`, dashboard de GPTs auditados, vídeos, pontos críticos | 🚧 Em desenvolvimento |

---

## 🚀 Quick Start

### Janus (Auditoria)

```bash
cd janus
pip install -r requirements.txt  # pyyaml, pytest, pytest-asyncio, httpx
python -m pytest janus/tests/ -q   # 18 testes verdes
python -m janus.queue.cli run      # roda fila
python -m janus.queue.cli report --data janus/relatorios/fila-2026-10-12
```

### HUB Web

```bash
cd hub-web
cp .env.example .env
# edite .env com suas chaves
npm install
npx prisma db push
npm run dev  # http://localhost:3000
```

### EscapeKit MCP

```bash
cd escapekit-mcp
# ver escapekit-mcp/README.md para detalhes
```

---

## 📁 Estrutura

```
.
├── janus/                    # Auditoria de GPTs
│   ├── queue/                # Fila, worker, scheduler, CLI, reporter
│   ├── runner/               # Stub/cloakbridge, evaluator, avaliar.py
│   ├── runner/tests/         # cat1, cat7, cat8, cat11, cat12 (YAML)
│   ├── links/                # registry.yaml (whitelist)
│   ├── relatorios/           # Templates + saída (gitignored)
│   └── docs/                 # paradigmas.md, poc-002-runbook.md
├── hub-web/                  # Next.js 14 + Prisma + NextAuth
│   ├── app/                  # App Router (dashboard, API, auth)
│   ├── components/           # UI components
│   ├── lib/                  # auth, prisma, utils
│   └── prisma/               # Schema PostgreSQL
├── escapekit-mcp/            # MCP Server (Apache-2.0)
├── scripts/                  # check_licenses.py, consolidate_licenses.py
├── .github/workflows/        # CI: license-check, janus-tests, hub-tests
├── LICENSE                   # Apache-2.0
├── NOTICE                    # Atribuição
├── THIRD-PARTY-LICENSES.md   # Consolidado (gerado no CI)
└── .gitignore
```

---

## 🔐 Licenças e Atribuição

- **Código principal**: Apache-2.0 (ver `LICENSE`, `NOTICE`)
- **escapekit-mcp**: Apache-2.0 (próprio `LICENSE`, `NOTICE`)
- **Terceiros**: Consolidado em `THIRD-PARTY-LICENSES.md` (gerado no CI)
- **Proibido em runtime**: GPL-2.0, GPL-3.0, AGPL-3.0 (CI falha se detectado)

> **Regra**: Nenhum release sem `THIRD-PARTY-LICENSES.md` atualizado.
> CI falha se `license-checker` detectar GPL/AGPL em dependência de runtime.

---

## 🧪 Testes

```bash
# Janus
python -m pytest janus/tests/ -q

# HUB (Trama)
cd /home/vector/trama && python -m pytest tests/test_hub.py -q
```

---

## 📚 Documentação

| Documento | Local |
|-----------|-------|
| Paradigmas de segurança | `janus/docs/paradigmas.md` |
| Plano PoC #002 | `janus/docs/poc-002-runbook.md` |
| Plano PoC #002 (case) | `janus/docs/bateria-jis-take-2.0.md` |
| Plano comercial master | `docs/plano-comercial-master.md` (este repo) |
| Livros recomendados | `janus/docs/paradigmas.md` (seção final) |

---

## 🤝 Contribuindo

1. Fork → branch `feat/nome` ou `fix/nome`
2. `pre-commit` roda: lint, testes, license-check
3. PR → CI passa (license-check, janus-tests, hub-tests)
4. Merge → deploy automático (staging → prod)

---

## 📄 Licença

Apache-2.0 — ver `LICENSE` e `NOTICE`.

> **escapekit-mcp** tem licença própria Apache-2.0 em `escapekit-mcp/`.