"""JANUS — estado runtime da fila (state.json). Escrita atômica + lock."""

from __future__ import annotations

import asyncio
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from janus.links.parser import extrair_id

STATE_PATH = Path(__file__).parent / "state.json"
_lock = asyncio.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def chave(link: str) -> str:
    return extrair_id(link) or link


def load() -> dict:
    if not STATE_PATH.exists():
        return {"iniciado_em": _now(), "links": {}}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def _save(doc: dict) -> None:
    fd, tmp = tempfile.mkstemp(dir=str(STATE_PATH.parent), prefix="state.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
        os.replace(tmp, STATE_PATH)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


async def atualizar(link: str, **campos) -> dict:
    """Atualiza (ou cria) a entrada do link. Chave = gpt_id extraído."""
    async with _lock:
        doc = load()
        k = chave(link)
        entry = doc["links"].get(k, {"status": "pendente", "tentativas": 0})
        entry.update(campos)
        doc["links"][k] = entry
        _save(doc)
        return entry


def exemplo() -> dict:
    return {
        "iniciado_em": "2026-10-11T14:00:00+00:00",
        "links": {
            "g-69f50c32803c819182125318574cdc3d": {
                "status": "concluido", "tentativas": 1,
                "face_a": {"taxa_falha": 0.20, "terminado_em": "2026-10-11T14:03:42+00:00"},
                "face_b": None, "greenlight": False,
                "achados": [{"id": "002", "nivel": "grave", "prompt_id": "8.1_texto", "canal": "[Texto]"}],
            }
        },
    }
