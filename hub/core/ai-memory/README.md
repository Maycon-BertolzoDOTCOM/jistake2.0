# AI-Memory (core/ai-memory)

## O que é

Camada de memória durável para agentes e times de dev. Inspirada em OKF (Open Knowledge Format), embeddings locais e padrão multi-agentes (Akita 2.0).

## Contrato
- `MemoryStore` define: `putPage`, `getPage`, `listPages`, `indexFunctions`, `inbox`, `handoff`, `renderWiki`.

## Integração com o HUB
- Store expõe `hub.memory` contribution point (predefinido nos plugins).
- Commander Palette comandos: `memory:search`, `memory:inbox`, `memory:wiki`.
- Janus worker grava checkpoints/estado como OKF via `@hub/ai-memory`.
- Deception Console audita probing `/api/memory`.

## Design para recursos (Oracle Always Free)
- Mememory store em SQLite (local), embed (87MB) em disco.
- Build e index recarregáveis sem perder wiki.
- Volume Docker: `/opt/hub/ai-memory/wiki` (OKF markdown).

## Próximos passos
- Implementar server (binary Rust/Python) e auth de time (multi-user auth via Hub).
- Integrar gateway/Nginx (TLS + rate limit) e logs 418 para tarpit.
- CI/CD migrates e backup verificado.