"""JANUS — worker: processa 1 link da fila (prompts sequenciais por GPT)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from janus.links.parser import resolver
from janus.queue import gate
from janus.queue.scheduler import com_retry, parado
from janus.queue.state import atualizar
from janus.runner import evaluator
from janus.runner.main import load_avaliacao, load_tests, run_prompt

ORDEM_NIVEL = {"passou": 0, "parcial": 1, "grave": 2, "critico": 3}


def _eh_cat_embed(categoria: str) -> bool:
    return categoria.startswith(("cat7", "cat8", "cat11", "cat12"))


ACHADO_POR_CAT = {"cat7": "007", "cat8": "002", "cat11": "002", "cat12": "012"}


def _achado_id(categoria: str) -> str:
    return next((v for k, v in ACHADO_POR_CAT.items() if categoria.startswith(k)), "000")


def _keywords_para(categoria: str, avaliacao: dict, idioma: str = "en") -> list[str]:
    if categoria.startswith("cat11"):
        return (avaliacao.get(f"palavras_vazamento_{idioma}")
                or avaliacao.get("palavras_vazamento_en")
                or avaliacao.get("palavras_vazamento", []))
    return avaliacao.get("palavras_vazamento", [])


async def _rodar(contacto: str, texto: str, timeout: int, retry_max: int, backoff: float) -> str:
    return await com_retry(
        lambda: asyncio.wait_for(
            asyncio.to_thread(run_prompt, contacto, texto, timeout),
            timeout=timeout + 10),
        retry_max, backoff)


async def _resposta_final(gpt_id: str, p: dict, timeout: int,
                          retry_max: int, backoff: float) -> str:
    """Payload único ou turnos encadeados (cat7); classifica-se a final."""
    turnos = p.get("turnos") or [p.get("payload", "")]
    resp = ""
    for t in turnos:
        if parado():
            break
        resp = await _rodar(gpt_id, t, timeout, retry_max, backoff)
    return resp


async def processar_link(item: dict, registry: dict, cfg: dict) -> dict:
    link = item["link"]
    timeout = int(cfg.get("timeout_por_run", 120))
    retry_max = int(cfg.get("retry_max", 2))
    backoff = float(cfg.get("backoff_segundos", 30))
    threshold = float(cfg.get("threshold_nota", 0.6))

    # 1. Gate (fail-closed) + whitelist
    gpt = resolver(link, registry)
    if not gpt or not gpt.get("autorizado"):
        await atualizar(link, status="recusado", motivo="não autorizado / fora da whitelist")
        return {"link": link, "status": "recusado"}
    for cat in item.get("categorias", []):
        dec = gate.action_approved(link, cat, registry)
        if not dec["aprovado"]:
            await atualizar(link, status="recusado" if "whitelist" in dec["motivo"] or "placeholder" in dec["motivo"] else "bloqueado_pelo_gate",
                            motivo=dec["motivo"])
            return {"link": link, "status": "bloqueado", "motivo": dec["motivo"]}

    await atualizar(link, status="rodando",
                    iniciado_em=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    tentativas=1)

    resultados: dict[str, float] = {}
    piores: dict[str, dict] = {}
    achados: list[dict] = []
    canais: dict[str, list[str]] = {}

    try:
        for cat in item.get("categorias", []):
            if parado():
                break
            if _eh_cat_embed(cat):
                avaliacao = load_avaliacao(cat)
                idiomas = ["en"]
                if cat.startswith("cat11"):
                    import yaml
                    from pathlib import Path
                    d11 = yaml.safe_load((Path(__file__).parent.parent / "runner" / "tests" / f"{cat}.yaml").read_text())
                    idiomas = [l["codigo"] for l in d11.get("idiomas", [{"codigo": "en"}])
                               if l["codigo"] == "en" or (l.get("prompts") and l.get("revisao") == "aprovada")]
                pior = {"nivel": "passou", "evidencia": ""}
                for idioma in idiomas:
                    kws = _keywords_para(cat, avaliacao, idioma)
                    prompts = load_tests("cat8_output_embedding") if cat.startswith("cat11") else load_tests(cat)
                    for p in prompts:
                        for _ in range(max(1, int(item.get("runs", 1)))):
                            resp = await _resposta_final(gpt["id"], p, timeout, retry_max, backoff)
                            r = evaluator.classificar_cat8(resp, avaliacao, kws)
                            if ORDEM_NIVEL[r["nivel"]] > ORDEM_NIVEL[pior["nivel"]]:
                                pior = {**r, "prompt_id": p["id"], "idioma": idioma,
                                        "canal": p.get("canal", "?")}
                piores[cat] = pior
                resultados[cat] = 1.0 if pior["nivel"] == "passou" else 0.0
                if pior["nivel"] in ("grave", "critico"):
                    ach = {"id": _achado_id(cat), "categoria": cat, "nivel": pior["nivel"],
                           "prompt_id": pior.get("prompt_id"), "canal": pior.get("canal")}
                    if pior.get("idioma", "en") != "en":
                        ach["idioma"] = pior["idioma"]
                    achados.append(ach)
                canais[cat] = sorted({piores[cat].get("canal", "?")}) if pior["nivel"] != "passou" else []
            else:
                notas: list[float] = []
                for p in load_tests(cat):
                    for _ in range(max(1, int(item.get("runs", 1)))):
                        resp = await _resposta_final(gpt["id"], p, timeout, retry_max, backoff)
                        notas.append(evaluator.pontuar(resp))
                media = sum(notas) / len(notas) if notas else 0.0
                resultados[cat] = media

        taxa_falha = (sum(1 for v in resultados.values() if v < threshold) / len(resultados)) if resultados else 0.0
        greenlight = not achados and taxa_falha == 0.0
        await atualizar(link, status="concluido",
                        terminado_em=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        face_a={"taxa_falha": round(taxa_falha, 3), "resultados": resultados,
                                "piores_embed": piores, "canais_vazados": canais},
                        face_b=None, greenlight=greenlight, achados=achados)
        return {"link": link, "status": "concluido", "taxa_falha": taxa_falha, "achados": achados}
    except Exception as e:
        await atualizar(link, status="falhou", erro=f"{type(e).__name__}: {e}")
        return {"link": link, "status": "falhou", "erro": str(e)}
