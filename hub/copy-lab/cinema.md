# Copy Lab — CinemaOps

## Headlines

- **"Projeção digital sem dor de cabeça"**
- **"CPL/PKL/KDM traduzidos para timeline visual"**
- **"Semáforo de KDM: verde = sessão roda, vermelho = para tudo"**

## Value Props

1. **Parser DCI seguro** — `defusedxml` com `forbid_dtd=True`, rejeita `<!DOCTYPE`, `<!ENTITY>`, >5MB
2. **Timeline de sessão** — Drag-and-drop: Trailers → Anúncios → Filme → Créditos → Intervalo
3. **Validação KDM** — Endereçada ao certificado X.509 do Media Block, semáforo de validade
4. **Round-trip XML** — Ordem visual → `<Reel>` do CPL sem perda de metadados

## Technical Differentiators

- **Zero trust XML**: `forbid_dtd=True` + `forbid_entities=True` + `forbid_external=True` + tamanho máximo
- **SMPTE-429/430 compliant**: CPL, PKL, KDM, Reel, Asset, Trusted Device List
- **Media Block awareness**: KDM validada contra thumbprint do certificado do projetor/IMB
- **TMS integration ready**: API para Theatre Management Systems (Arts Alliance, CineSys, Vista)

## Use Cases

- **Exibidor independente**: 1-5 salas, sem equipe TI, precisa validar KDMs antes da sessão
- **Circuito regional**: 20+ salas, ingest automatizado, verificação de integridade DCP (PKL hashes)
- **Distribuidor**: Gera CPL/PKL a partir de assets, entrega KDMs por API

## Portfolio Bullets

- Parser CPL/PKL/KDM com `defusedxml` hardening (DTD, entidades, size limit)
- Timeline visual com drag-and-drop que traduz de volta para `<Reel>` order
- Semáforo de KDM: verde (válido), amarelo (≤7 dias), vermelho (expirado/revogado)
- Glossário DCI: 20+ termos (SMPTE, JPEG2000, MXF, IMB, Trusted Device List)
- Plugin architecture prova reutilização do core agnóstico