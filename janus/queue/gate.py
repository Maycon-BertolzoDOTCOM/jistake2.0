"""JANUS — Gate de aprovação para probes (v1: mock local).

Contrato usado pelo worker antes de QUALQUER probe::

    from janus.queue import gate
    decisao = gate.action_approved(link, categoria, registry)
    if not decisao["aprovado"]:
        # marcar como "recusado" / "bloqueado_pelo_gate", sem executar
        ...

v1 (este arquivo): decisão local a partir do `registry.yaml` —
`autorizado: true` + `gate: pre-aprovado`. Sem dependência do SOC,
sem efeito colateral no import, só stdlib.

v2 (integração real, fora deste PR): consultar o approval store do SOC
(`soc/gateway/offensive_approvals/store.py` — fluxo pair-human
draft → campaign_approved → action_approved, SQLite + hashchain) e o
check de escopo (`check_scope`, duas fechaduras: resposta do gate +
`approved_by`). Sem resposta do gate = nega (fail-closed).

Verificado em 2026-10-11: não existe callable `action_approved(link,
categoria)` pronto no SOC — por isso o mock v1. Não travar o PoC por
causa de gate incompleto.
"""

from __future__ import annotations

import re

# Regex local (mesmo padrão de janus/links/parser.py, que ainda não existe
# neste PR — duplicado aqui de propósito para gate.py ser standalone).
_PADRAO_GPT = re.compile(r"chatgpt\.com/g/(g-[A-Za-z0-9]+)")


def _extrair_id(link: str) -> str | None:
    m = _PADRAO_GPT.search(link or "")
    return m.group(1) if m else None


def _entrada_do_link(link: str, registry: dict) -> dict | None:
    gpt_id_url = _extrair_id(link)
    for g in (registry or {}).get("gpts", []):
        entry_link = g.get("link", "")
        if gpt_id_url and gpt_id_url in entry_link:
            return g
        if entry_link and entry_link in link:
            return g
    return None


def action_approved(link: str, categoria: str, registry: dict) -> dict:
    """Decide se um probe pode executar. Nunca levanta — nega em dúvida."""
    try:
        g = _entrada_do_link(link, registry)
        if g is None:
            return {"aprovado": False, "motivo": "link fora do registry (whitelist)"}
        if not g.get("autorizado", False):
            return {"aprovado": False, "motivo": f"link não autorizado: {g.get('id')}"}
        if g.get("link", "").startswith("PLACEHOLDER") or "TROCAR" in g.get("link", ""):
            return {"aprovado": False, "motivo": "link placeholder, sem alvo real"}
        if categoria not in (g.get("categorias") or []):
            return {"aprovado": False, "motivo": f"categoria {categoria} fora do escopo de {g.get('id')}"}
        if g.get("gate") != "pre-aprovado":
            return {"aprovado": False, "motivo": f"gate pendente para {g.get('id')}", "bloqueado_pelo_gate": True}
        return {"aprovado": True, "gpt_id": g.get("id"), "via": "registry pre-aprovado (v1)"}
    except Exception as e:  # fail-closed
        return {"aprovado": False, "motivo": f"erro interno do gate: {e}"}
