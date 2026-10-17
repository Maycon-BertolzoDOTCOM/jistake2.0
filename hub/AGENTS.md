# HUB — Regras do Projeto

## Arquitetura

O HUB é um **motor agnóstico de domínio** com três camadas:

1. **Core** (TypeScript): Timeline Engine, Status Engine, Command Palette, Deception Console, Reactor Config
2. **Plugins** (TypeScript + Python via Reactor): SecurityOps (JISTake2.0), CinemaOps, SaúdeOps
3. **Infra** (Nginx, iptables, Honeypot, NSGs Terraform): Camada de deception

## Princípios

- **Core não conhece domínios**: Não sabe o que é "cat1", "filme", "paciente". Só sabe `Entity`, `TimelineBlock`, `StatusLight`.
- **Plugins implementam `HubPlugin`**: 5 contribution points (parser, timeline, status, actions, glossary).
- **Reactor gerencia plugins**: Descoberta, SemVer, lazy loading, cross-tier (TS ↔ Python).
- **Keyboard-first**: Command Palette (`⌘K`) é a interface primária. Sidebar é secundária.
- **Deception ativa**: Tarpit + honeypot + iptables stateful. Métricas mapeadas ao MITRE Engage.

## Convenções de Código

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`
- Interfaces sobre types para contratos públicos
- `readonly` em props de componentes
- Nomenclatura: `PascalCase` (tipos), `camelCase` (valores), `SCREAMING_SNAKE` (constantes)
- Arquivos: `kebab-case.ts`, componentes React: `PascalCase.tsx`

### Python (Honeypot + Plugin Bridge)
- `ruff` + `mypy --strict`
- Type hints obrigatórios em funções públicas
- `dataclasses` + `slots=True` para DTOs
- `defusedxml` com `forbid_dtd=True` explícito

### React
- Server Components por default, `'use client'` só quando necessário
- `aria-*` em todos os elementos interativos
- `clsx` + `tailwind-merge` para classes
- Componentes em `components/` do workspace

### Git
- Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `infra:`
- Branch: `feat/<slug>`, `fix/<slug>`
- PR requer: typecheck, lint, test pass

## Contribution Points (HubPlugin)

```typescript
interface HubPlugin {
  manifest: PluginManifest;
  parser: EntityParser;      // canParse, parse, sanitize
  timeline: TimelineProvider; // getBlocks, reorder, toXml
  status: StatusProvider;     // check, severity
  actions: ActionProvider;    // getActions, execute
  glossary: GlossaryProvider; // getTerms
}
```

## Anti-Patterns

- ❌ Core importa de plugins
- ❌ Parser usa `xml.etree` puro
- ❌ Tarpit com `gzip on`
- ❌ Backend exposto na internet
- ❌ Security Lists no lugar de NSGs
- ❌ Honeypot como root
- ❌ JISTake2.0 rodando na VM ARM do HUB

## Testes

- Unit: `vitest` (TS), `pytest` (Python) — coverage ≥ 80%
- Integration: `playwright` para Command Palette + Timeline
- Contract: Schema validation para `HubPlugin` manifest

## Deploy

- VM ARM Oracle Always Free: 2 OCPU / 12 GB
- Frontend: Object Storage (SPA estática)
- API: Nginx → backend em `127.0.0.1:8080`
- Deception: Nginx tarpit em `/loop-defense`, honeypot em `127.0.0.1:5001`
- JISTake2.0: Vercel + Prisma/PostgreSQL (fora da VM)