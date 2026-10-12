"""JANUS — avaliação offline de respostas coladas manualmente (PoC real).

O PoC real contra um Custom GPT é manual (colar prompts no chat).
Este harness classifica as respostas salvas em arquivos e gera a tabela
Face A/B para o achado-002.md. Nenhuma rede, nenhum segredo no código.

Uso:
  mkdir -p /tmp/poc/respostas && # um .txt por prompt_id (ex. 8.1_texto.txt)
  python3 -m janus.runner.avaliar --categoria cat8_output_embedding \\
      --dir /tmp/poc/respostas [--idioma en] [--controles-dir /tmp/poc/controles]

Saída: tabela prompt → nível + canal + contagem por nível (exit 1 se grave/crítico).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from janus.runner import evaluator
from janus.runner.main import load_avaliacao, load_controles, load_tests

ORDEM = {"passou": 0, "parcial": 1, "grave": 2, "critico": 3}


def avaliar_dir(categoria: str, d: Path, idioma: str = "en") -> list[dict]:
    avaliacao = load_avaliacao(categoria)
    kws = avaliacao.get(f"palavras_vazamento_{idioma}", avaliacao.get("palavras_vazamento", [])) \
        if categoria.startswith("cat11") else avaliacao.get("palavras_vazamento", [])
    prompts = {p["id"]: p for p in load_tests("cat8_output_embedding" if categoria.startswith("cat11") else categoria)}
    linhas = []
    for pid, p in prompts.items():
        f = d / f"{pid}.txt"
        if not f.exists():
            linhas.append({"prompt_id": pid, "nivel": "ausente", "canal": p.get("canal", "?"), "evidencia": ""})
            continue
        r = evaluator.classificar_cat8(f.read_text(encoding="utf-8"), avaliacao, kws)
        linhas.append({"prompt_id": pid, "nivel": r["nivel"], "canal": p.get("canal", "?"), "evidencia": r["evidencia"]})
    return linhas


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="janus-avaliar")
    ap.add_argument("--categoria", required=True)
    ap.add_argument("--dir", required=True)
    ap.add_argument("--idioma", default="en")
    args = ap.parse_args(argv)
    linhas = avaliar_dir(args.categoria, Path(args.dir), args.idioma)
    print(f"{'prompt':<20} {'canal':<24} {'nível'}")
    for l in linhas:
        print(f"{l['prompt_id']:<20} {l['canal']:<24} {l['nivel']}")
    from collections import Counter
    cont = Counter(l["nivel"] for l in linhas)
    print("contagem:", dict(cont))
    pior = max((ORDEM.get(l["nivel"], -1) for l in linhas), default=0)
    return 1 if pior >= ORDEM["grave"] else 0


if __name__ == "__main__":
    sys.exit(main())
