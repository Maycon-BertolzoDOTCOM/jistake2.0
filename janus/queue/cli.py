"""JANUS CLI: janus enqueue / run / status / report / stop.

Uso: python -m janus.queue.cli <comando> [opções]
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

from janus.links.parser import resolver
from janus.queue.adapters import FileQueueAdapter
from janus.queue.scheduler import STOP_FILE, rodar_fila
from janus.queue.state import load as load_state
from janus.queue.worker import processar_link

REGISTRY_PATH = Path(__file__).parent.parent / "links" / "registry.yaml"


def _registry() -> dict:
    return yaml.safe_load(REGISTRY_PATH.read_text(encoding="utf-8"))


def cmd_enqueue(args) -> int:
    reg = _registry()
    g = resolver(args.link, reg)
    if not g or not g.get("autorizado"):
        print("recusado: link fora da whitelist ou não autorizado")
        return 2
    FileQueueAdapter().enqueue({
        "link": args.link,
        "prioridade": args.prioridade,
        "runs": args.runs,
        "categorias": (args.categorias.split(",") if args.categorias
                       else g.get("categorias", [])),
    })
    print(f"enfileirado: {g['id']} ({args.prioridade})")
    return 0


def cmd_run(args) -> int:
    import yaml as _yaml
    reg = _registry()
    adapter = FileQueueAdapter()
    cfg = adapter.config()
    fila = adapter.listar()
    if args.link:
        fila = [f for f in fila if f.get("link") == args.link]
        if not fila:
            print("link não está na fila")
            return 2
    if STOP_FILE.exists():
        STOP_FILE.unlink()
    res = asyncio.run(rodar_fila(fila, int(cfg.get("concorrencia", 3)),
                                 lambda item: processar_link(item, reg, cfg)))
    ok = sum(1 for r in res if isinstance(r, dict) and r.get("status") == "concluido")
    print(f"concluídos: {ok}/{len(res)}")
    return 0 if ok == len(res) else 1


def cmd_status(args) -> int:
    st = load_state()
    print(f"JANUS — Fila de Auditoria ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC)")
    print(f"{'GPT':<24} {'Status':<12} {'Face A':<10} {'Face B':<8} {'Greenlight'}")
    for k, v in st.get("links", {}).items():
        fa = (v.get("face_a") or {}).get("taxa_falha", "—")
        fb = ((v.get("face_b") or {}).get("taxa_falha", "—")) if v.get("face_b") else "—"
        print(f"{k:<24} {v.get('status', '?'):<12} {str(fa):<10} {str(fb):<8} {v.get('greenlight', '—')}")
    return 0


def cmd_report(args) -> int:
    from janus.queue.reporter import gerar
    out = gerar(Path(args.data))
    print(f"relatório em: {out}")
    return 0


def cmd_stop(args) -> int:
    STOP_FILE.touch()
    print("kill switch acionado (.stop). Workers em curso terminam o item atual.")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="janus")
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("enqueue"); e.add_argument("--link", required=True)
    e.add_argument("--prioridade", default="media", choices=["alta", "media", "baixa"])
    e.add_argument("--runs", type=int, default=2); e.add_argument("--categorias", default="")
    e.set_defaults(fn=cmd_enqueue)
    r = sub.add_parser("run"); r.add_argument("--link", default=""); r.set_defaults(fn=cmd_run)
    s = sub.add_parser("status"); s.set_defaults(fn=cmd_status)
    p = sub.add_parser("report"); p.add_argument("--data", required=True); p.set_defaults(fn=cmd_report)
    t = sub.add_parser("stop"); t.set_defaults(fn=cmd_stop)
    args = ap.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
