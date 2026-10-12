"""JANUS — reporter: consolidado.md + resultados.csv + consolidado.json + por-gpt/."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from janus.queue.state import load as load_state

ORDEM_NIVEL = {"critico": 0, "grave": 1, "parcial": 2, "passou": 3}


def gerar(data_dir: str | Path) -> Path:
    data_dir = Path(data_dir)
    (data_dir / "por-gpt").mkdir(parents=True, exist_ok=True)
    st = load_state()
    links = st.get("links", {})

    rows = []
    for k, v in links.items():
        fa = v.get("face_a") or {}
        for cat, nota in (fa.get("resultados") or {}).items():
            rows.append({"gpt_id": k, "status": v.get("status"), "tentativas": v.get("tentativas", 0),
                         "taxa_falha": fa.get("taxa_falha"), "categoria": cat, "nota_media": nota,
                         "greenlight": v.get("greenlight")})
    with open(data_dir / "resultados.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["gpt_id", "status", "tentativas", "taxa_falha",
                                          "categoria", "nota_media", "greenlight"])
        w.writeheader(); w.writerows(rows)

    ranking = sorted(links.items(), key=lambda kv: ((kv[1].get("face_a") or {}).get("taxa_falha") is None,
                     (kv[1].get("face_a") or {}).get("taxa_falha") or 0))
    md = ["# Relatório de Fila — Janus", "", "## Ranking por resistência", "",
          "| # | GPT | Taxa de falha | Greenlight |", "|---|---|---|---|"]
    for i, (k, v) in enumerate(ranking, 1):
        fa = v.get("face_a") or {}
        md.append(f"| {i} | {k} | {fa.get('taxa_falha', '—')} | {v.get('greenlight', '—')} |")
    md += ["", "## Achados", ""]
    for k, v in links.items():
        for a in v.get("achados", []):
            md.append(f"- {k}: {a.get('id')} nível {a.get('nivel')} "
                      f"(prompt {a.get('prompt_id')}, canal {a.get('canal')}" +
                      (f", idioma {a.get('idioma')}" if a.get("idioma") else "") + ")")
    if not any(v.get("achados") for v in links.values()):
        md.append("Nenhum achado grave/crítico.")
    (data_dir / "consolidado.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    # JSON legível por máquina — consumido pelo HUB (/v1/hub/achados).
    # Evidências truncadas em 200 chars; canário real NUNCA aqui em produção
    # (só redigido). Ordenado por severidade para o HUB renderizar direto.
    achados = []
    for k, v in links.items():
        for a in v.get("achados", []):
            achados.append({"gpt": k, "achado": a.get("id"), "nivel": a.get("nivel"),
                            "categoria": a.get("categoria"), "prompt_id": a.get("prompt_id"),
                            "canal": a.get("canal"), "idioma": a.get("idioma", "en")})
    achados.sort(key=lambda a: ORDEM_NIVEL.get(a["nivel"], 9))
    (data_dir / "consolidado.json").write_text(json.dumps({
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "gpt_total": len(links),
        "greenlight_total": sum(1 for v in links.values() if v.get("greenlight") is True),
        "achados": achados,
        "ranking": [{"gpt": k, "taxa_falha": (v.get("face_a") or {}).get("taxa_falha"),
                     "greenlight": v.get("greenlight")} for k, v in ranking],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    return data_dir
