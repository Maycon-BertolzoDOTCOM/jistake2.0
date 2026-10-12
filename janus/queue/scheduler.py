"""JANUS — scheduler: ordenação por prioridade + concorrência limitada."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable

PESO = {"alta": 0, "media": 1, "baixa": 2}

STOP_FILE = __import__("pathlib").Path(__file__).parent / ".stop"


def ordenar(fila: list[dict]) -> list[dict]:
    """alta > media > baixa; empate = FIFO (sorted é estável)."""
    return sorted(fila, key=lambda x: PESO.get(x.get("prioridade", "media"), 1))


def parado() -> bool:
    return STOP_FILE.exists()


async def rodar_fila(
    fila: list[dict],
    concorrencia: int,
    processar: Callable[[dict], Awaitable],
) -> list:
    """Roda itens com no máximo `concorrencia` em paralelo. Kill switch via .stop."""
    sem = asyncio.Semaphore(max(1, concorrencia))

    async def wrapper(item: dict):
        if parado():
            return {"link": item.get("link"), "status": "interrompido"}
        async with sem:
            if parado():
                return {"link": item.get("link"), "status": "interrompido"}
            return await processar(item)

    return await asyncio.gather(*(wrapper(i) for i in ordenar(fila)), return_exceptions=True)


async def com_retry(fn: Callable[[], Awaitable], retry_max: int, backoff: float):
    """Tenta fn() até retry_max+1 vezes, com backoff exponencial."""
    for tentativa in range(retry_max + 1):
        try:
            return await fn()
        except Exception:
            if tentativa == retry_max:
                raise
            await asyncio.sleep(backoff * (2 ** tentativa))
