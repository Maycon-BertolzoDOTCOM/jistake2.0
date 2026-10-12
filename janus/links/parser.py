"""JANUS — parser de links de GPTs (whitelist via registry.yaml)."""

from __future__ import annotations

import re
import unicodedata

PADRAO_GPT = re.compile(r"chatgpt\.com/g/(g-[A-Za-z0-9]+)")


def extrair_id(link: str) -> str | None:
    """Extrai o gpt_id da URL (ex. g-69f50c32...). None se inválida."""
    m = PADRAO_GPT.search(link or "")
    return m.group(1) if m else None


def _slug(txt: str) -> str:
    txt = unicodedata.normalize("NFKD", txt or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", txt.lower()).strip("-")


def resolver(link: str, registry: dict) -> dict | None:
    """Casa link → entrada do registry. Match primário por gpt_id na URL;
    fallback por slug normalizado. None = fora da whitelist."""
    gpt_id_url = extrair_id(link)
    if not gpt_id_url and not link:
        return None
    for g in (registry or {}).get("gpts", []):
        entry_link = g.get("link", "")
        if gpt_id_url and gpt_id_url in entry_link:
            return g
        if _slug(g.get("id", "")) and _slug(g.get("id", "")) in _slug(link):
            return g
    return None
