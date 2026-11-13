"""JANUS — Gate de aprovação para probes (v1: mock local).

Contrato usado pelo worker antes de QUALQUER probe::

    from janus.queue import gate
    decisao = gate.action_approved(link, categoria, registry)
    if not decisao["aprovado"]:
        # marcar como "recusado" / "bloqueado_pelo_gate", sem executar
        ...

v1 (este arquivo): decisão local a partir do `registry.yaml` —
`autorizado: true` + `gate: pre-aprovado` + `janela` válida + `limites` conhecidos.
Sem dependência do SOC, sem efeito colateral no import, só stdlib.

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
from datetime import datetime, timezone

# Limites conhecidos (fail-closed: limite desconhecido = nega)
LIMITES_CONHECIDOS = {
    "sem_dos",
    "sem_dados_reais",
    "sem_engenharia_social",
    "sem_persistencia",
    "sem_movimento_lateral",
    "sem_exfiltracao",
    "read_only",
}

# Regex local (mesmo padrão de janus/links/parser.py, que ainda não existe
# neste PR — duplicado aqui de propósito para gate.py ser standalone).
_PADRAO_GPT = re.compile(r"chatgpt\.com/g/(g-[A-Za-z0-9]+)")

# Regex para janela ISO 8601: "YYYY-MM-DDTHH:MM:SSZ/YYYY-MM-DDTHH:MM:SSZ"
_PADRAO_JANELA = re.compile(
    r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$"
)


def _extrair_id(link: str) -> str | None:
    m = _PADRAO_GPT.search(link or "")
    return m.group(1) if m else None


def _parse_janela(janela: str) -> tuple[datetime, datetime] | None:
    """Parse janela ISO 8601 interval. Returns (inicio, fim) UTC or None if invalid."""
    m = _PADRAO_JANELA.match(janela or "")
    if not m:
        return None
    try:
        inicio = datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
        fim = datetime.fromisoformat(m.group(2).replace("Z", "+00:00"))
        if inicio >= fim:
            return None
        return inicio, fim
    except ValueError:
        return None


def _validar_limites(limites: list[str]) -> tuple[bool, str]:
    """Valida lista de limites. Returns (ok, motivo_se_falhou)."""
    for l in limites or []:
        if l not in LIMITES_CONHECIDOS:
            return False, f"limite desconhecido: {l}"
    return True, ""


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

        # NOVO: validação de janela de autorização
        janela = g.get("janela", "")
        if not janela:
            return {"aprovado": False, "motivo": "janela de autorização ausente"}
        parsed = _parse_janela(janela)
        if parsed is None:
            return {"aprovado": False, "motivo": "janela de autorização inválida (formato ISO 8601 UTC)"}
        inicio, fim = parsed
        agora = datetime.now(timezone.utc)
        if not (inicio <= agora <= fim):
            return {"aprovado": False, "motivo": f"fora da janela de autorização ({inicio.isoformat()}–{fim.isoformat()})"}

        # NOVO: validação de limites
        limites_ok, motivo_limite = _validar_limites(g.get("limites") or [])
        if not limites_ok:
            return {"aprovado": False, "motivo": motivo_limite}

        # NOVO: campos obrigatórios de autorização
        for campo in ("autorizacao_id", "autorizado_por", "escopo"):
            if not g.get(campo):
                return {"aprovado": False, "motivo": f"campo de autorização obrigatório ausente: {campo}"}

        return {
            "aprovado": True,
            "gpt_id": g.get("id"),
            "via": "registry pre-aprovado (v1)",
            "autorizacao_id": g.get("autorizacao_id"),
            "autorizado_por": g.get("autorizado_por"),
            "janela": janela,
            "limites": g.get("limites", []),
            "escopo": g.get("escopo", []),
        }
    except Exception as e:  # fail-closed
        return {"aprovado": False, "motivo": f"erro interno do gate: {e}"}
