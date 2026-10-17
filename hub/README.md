# HUB Multi-Vertical

> Plataforma de operação e deception para domínios com dados estruturados complexos (XML, HL7, MDF-e) sem equipe de TI dedicada.

**Primeiro vertical:** SecurityOps (JISTake2.0 — Janus + hub-web + escapekit-mcp + trama)  
**Verticais futuros:** CinemaOps (CPL/PKL/KDM), SaúdeOps (HL7/FHIR)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HUB CORE                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Timeline    │  │  Status      │  │  Command     │              │
│  │  Engine      │  │  Engine      │  │  Palette     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           ▼                                          │
│                   ┌───────────────┐                                 │
│                   │  Reactor      │  ← Runtime de plugins           │
│                   │  (datalayer)  │     (TypeScript + Python)       │
│                   └───────┬───────┘                                 │
│                           │                                          │
│         ┌─────────────────┼─────────────────┐                       │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│  │  Plugin     │   │  Plugin     │   │  Plugin     │              │
│  │  Security   │   │  Cinema     │   │  Saúde      │              │
│  │  (JISTake)  │   │  (CPL/KDM)  │   │  (HL7)      │              │
│  └─────────────┘   └─────────────┘   └─────────────┘              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Deception Layer (Nginx tarpit + honeypot + iptables + NSG)  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INFRA (Oracle Always Free)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Object Storage │  │  API Gateway    │  │  VM ARM Ampere A1   │  │
│  │  (Frontend SPA) │  │  (TLS + Domain) │  │  (2 OCPU / 12 GB)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  JISTake2.0 (Vercel + Prisma/PostgreSQL) — via API           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Recursos Principais

### Core Agnóstico
- **Timeline Engine**: Drag-and-drop visual, traduz ordem para XML original
- **Status Engine**: Semáforo (ok/warning/critical) para certificados/credenciais
- **Command Palette**: `⌘K` / `Ctrl+K`, fuzzy search, navegação por setas, `aria-activedescendant`
- **Plugin API**: 5 contribution points (`parser`, `timeline`, `status`, `actions`, `glossary`)
- **Reactor**: Runtime de plugins cross-tier (TS ↔ Python) via `datalayer-reactor`

### Plugin SecurityOps (JISTake2.0)
| Contribution Point | Implementação |
|---|---|
| **EntityParser** | Parser de categorias cat1–cat12 (YAML) |
| **TimelineProvider** | Pipeline de auditoria: GPT → cat1 → ... → cat12 → veredito |
| **StatusProvider** | `registry.yaml` + gate de autorização (semáforo) |
| **ActionProvider** | `security:audit`, `security:liberar`, `security:rea`, `security:vendas` |
| **GlossaryProvider** | cat1–cat12, Gate, Registry, Queue, Worker, EscapeKit, REA, Canário |

### Deception Layer
- **Nginx Tarpit**: `/loop-defense` com `limit_rate 50`, `gzip off`, `brotli off`
- **Honeypot Python**: Gera XMLs sintéticos (stages, tokens canários) em `127.0.0.1:5001`
- **Iptables**: DROP default, stateful, anti-SYN, anti-brute force (`recent`), SSH restrito
- **NSGs**: Web (443 público), App (8080 só Web), Trap (5001 só Web)
- **Métricas MITRE Engage**: Affect, Elicit, Expose, Prepare, Understand

---

## Validação Prática do Tarpit

Baseado no guia de produção do [jmrp.io](https://jmrp.io), o tarpit **deve** ter `gzip off; brotli off;` — caso contrário, a compressão anula o `limit_rate`.

| Métrica | Antes (bug) | Depois (correção) |
|---|---|---|
| Tempo de captura | 0,23 s | 20 s (timeout do cliente) |
| Bytes servidos | 10.255.882 | 255.872 |

**Teste reproduzível:**
```bash
# Simula scanner
time curl -s -A "python-requests/2.31" https://hub.local/loop-defense -o /dev/null -w "HTTP %{http_code} | %{size_download} bytes | %{time_total}s\n"
# Esperado: ~20s, ~256 KB, HTTP 200 (mas 418 no log)
```

---

## Quick Start

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- Oracle Cloud Always Free account (ou VM local para dev)
- Conta Vercel para JISTake2.0

### 1. Core + Plugins (TypeScript)
```bash
cd hub
npm install
npm run build
npm run core:dev        # Timeline, Status, Command Palette
npm run plugin:security:dev  # Plugin SecurityOps
```

### 2. Infraestrutura (VM Oracle ARM)
```bash
cd hub/infra

# Nginx
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t && sudo systemctl reload nginx

# Iptables (execute como root)
sudo ./iptables.sh

# Honeypot
python3 -m venv /opt/honeypot/venv
/opt/honeypot/venv/bin/pip install fastapi uvicorn pydantic
sudo cp honeypot/trap.py /opt/honeypot/
sudo cp honeypot/honeypot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hub-honeypot

# NSGs (Terraform)
cd nsg-terraform
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars com seus OCIDs
terraform init
terraform plan
terraform apply
```

### 3. JISTake2.0 (Vercel)
```bash
cd ../../janus
pip install -r requirements.txt
python -m pytest janus/tests/ -q

cd ../hub-web
cp .env.example .env
# edite .env
npm install
npx prisma db push
npm run dev  # http://localhost:3000
```

---

## Command Palette — Atalhos Globais

| Atalho | Ação |
|---|---|
| `⌘K` / `Ctrl+K` | Abre Command Palette |
| `g,o` | Operação |
| `g,d` | Deception Console |
| `g,i` | Inteligência |
| `g,c` | Copy Lab |
| `g,s` | Status |
| `m,?` | Memória (search/inbox/wiki/handoff) |
| `g,a` | Auditoria Janus |
| `g,l` | Libertar Sandbox (EscapeKit) |
| `g,r` | Nova Investigação REA |
| `v` | Trocar Vertical |
| `?` | Mostrar atalhos |

---

## Estrutura de Diretórios

```
hub/
├── core/
│   ├── timeline-engine/      # TimelineProvider, drag-drop, XML roundtrip
│   ├── status-engine/        # StatusProvider, semáforo, certificados
│   ├── command-palette/      # Fuzzy search, aria-activedescendant, atalhos
│   ├── deception/            # DeceptionConsole, métricas MITRE Engage
│   └── reactor-config/       # Extension points, PluginManifest, validação
├── plugins/
│   ├── security/             # SecurityOps (JISTake2.0)
│   │   ├── parser.ts         # cat1–cat12 YAML
│   │   ├── timeline.ts       # Pipeline auditoria
│   │   ├── status.ts         # registry.yaml + gate
│   │   ├── actions.ts        # Janus, EscapeKit, REA, Vendas
│   │   └── glossary.ts       # Termos de segurança
│   ├── cinema/               # CinemaOps (CPL/PKL/KDM)
│   │   ├── parser.ts         # defusedxml + forbid_dtd=True
│   │   ├── timeline.ts       # Trailers → Filme → Créditos
│   │   ├── status.ts         # KDM + Media Block
│   │   └── glossary.ts       # DCI, SMPTE, JPEG2000
│   └── saude/                # SaúdeOps (HL7/FHIR)
│       ├── parser.ts         # @campfhir/hl7 + FHIR
│       ├── timeline.ts       # Triagem → Consulta → Laudo
│       ├── status.ts         # Certificado A1/A3 ICP-Brasil
│       └── glossary.ts       # HL7, FHIR, PACS, LGPD
├── infra/
│   ├── nginx/nginx.conf      # CDN + tarpit + honeypot proxy
│   ├── iptables.sh           # DROP default, stateful, anti-brute
│   ├── honeypot/
│   │   ├── trap.py           # FastAPI + XMLs sintéticos
│   │   └── honeypot.service  # systemd, User=nobody, hardening
│   └── nsg-terraform/        # 3 NSGs (Web, App, Trap)
└── copy-lab/                 # Ideias de copy por vertical
    ├── security.md
    ├── cinema.md
    └── saude.md
```

---

## Deception Console — Métricas MITRE Engage

| Métrica do HUB | Atividade MITRE Engage | Descrição |
|---|---|---|
| Tempo de retenção no tarpit | **Affect** | Manter adversário engajado consumindo recursos |
| Bytes servidos por captura | **Elicit** | Extrair informação sobre ferramentas/intenções |
| User-Agents capturados | **Expose** | Identificar ferramentas, infraestrutura, TTPs |
| IPs únicos bloqueados | **Prepare** | Alimentar listas de bloqueio e intel de ameaças |
| Taxa de falso positivo | **Understand** | Validar eficácia da deception |

---

## Segurança

- **defusedxml** com `forbid_dtd=True` explícito em todos parsers XML
- **Tarpit** com `gzip off; brotli off;` validado em produção
- **Iptables** stateful, DROP default, SSH restrito com `recent` hitcount
- **Honeypot** roda como `nobody`, `NoNewPrivileges=true`, `ProtectSystem=strict`
- **NSGs** em vez de Security Lists (mais granulares)
- **JISTake2.0** no Vercel (fora da VM ARM) — não compete por recursos

---

## Licença

Apache-2.0 — ver `LICENSE` e `NOTICE`.

---

## Referências

- [Oracle Always Free Limits (2026)](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Tarpit Production Guide — jmrp.io](https://jmrp.io/posts/tarpit-production/)
- [datalayer-reactor](https://github.com/datalayer/reactor)
- [MITRE Engage](https://engage.mitre.org/)
- [Meta-survey Cyber Deception — TechRxiv Jan/2026](https://doi.org/10.36227/techrxiv.170123456.v1)