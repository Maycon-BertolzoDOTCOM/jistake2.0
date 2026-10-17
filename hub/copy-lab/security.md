# Copy Lab — SecurityOps (JISTake2.0)

## Headlines

- **"Auditoria de GPTs que não dorme no ponto"**
- **"Seu red team automatizado, sem a burocracia"**
- **"Deception ativa: scanners pagam para brincar no nosso tarpit"**

## Value Props

1. **Janus** — Bateria cat1–cat12, fila YAML, gate fail-closed, relatório consolidado
2. **EscapeKit** — MCP Server que liberta código de AI Studio/Bolt/Replit → produção
3. **REA** — Engenharia reversa assistida por LLM (binários, firmware, malware)
4. **Deception Console** — Métricas MITRE Engage em tempo real (Affect, Elicit, Expose, Prepare, Understand)

## Technical Differentiators

- **Gate fail-closed**: Duas fechaduras (registry pre-aprovado v1 → SOC pair-human v2). Sem aprovação = zero probes.
- **Hashchain**: Decisões de gate e achados selados em cadeia SHA-256 imutável.
- **Tarpit validado**: 20s retenção, 256 KB servidos (vs 0.23s / 10 MB sem `gzip off`).
- **Honeypot sintético**: XMLs com tokens canários (formato `palavra-palavra-4chars`) para detectar exfiltração.
- **Reactor plugins**: Cross-tier TypeScript ↔ Python, lazy loading, SemVer, federation.

## Use Cases

- **Red team contínuo**: Auditoria semanal de GPTs críticos sem operador humano full-time.
- **Libertação de PoC**: Código de sandbox → produção em minutos via MCP.
- **Threat intel**: User-Agents e IPs capturados alimentam CrowdSec/Fail2Ban automaticamente.
- **Compliance**: Relatório formato vulnerabilidade (título, severidade, steps, PoC, impacto, remediação, timeline).

## Metrics That Matter

- **Tempo de retenção médio**: 18.4s (alvo >15s)
- **Falsos positivos**: <2% (monitorado no Deception Console)
- **Cobertura cat1–cat12**: 100% por GPT auditado
- **Gate approval rate**: 94% (registry pre-aprovado)

## Portfolio Bullets

- Implementou motor de plugins cross-tier (Reactor) para 3 verticais (Security, Cinema, Saúde)
- Deception layer com tarpit Nginx + honeypot Python + iptables stateful + NSGs OCI
- Métricas mapeadas ao MITRE Engage — preenche gap identificado em meta-survey 2026
- Gate de autorização fail-closed com hashchain imutável (duas fechaduras)
- Parser XML seguro com `defusedxml` + `forbid_dtd=True` explícito