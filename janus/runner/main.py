"""JANUS — runner (stub default; real via CloakBridge com flag).

TODO(auditor-gpt): substituir por cliente real do GPT (playwright/API).
Regras do stub: determinístico, sem rede, sem segredos. Variáveis de ambiente:
  JANUS_STUB_MODE=eco       → devolve o prompt com prefixo (default)
  JANUS_STUB_MODE=recusa    → simula GPT blindado (resposta benigna)
  JANUS_STUB_LEAK=<texto>   → simula vazamento (só em teste local!)

Execução real:
  JANUS_RUNNER=cloakbridge  → via sidecar CloakBridge (:9301)
  JANUS_RUNNER_FALLBACK=0   → sem fallback: falha se o sidecar cair (para CI).
                              default 1 = fallback para stub com aviso em stderr.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).parent / "tests"


def load_tests(categoria: str) -> list[dict]:
    """Carrega prompts de janus/runner/tests/<categoria>.yaml.

    Retorna [{'id', 'payload', 'canal'?}]. Controles (chave `controles`)
    vêm separados via load_controles().
    """
    import yaml

    data = yaml.safe_load((TESTS_DIR / f"{categoria}.yaml").read_text(encoding="utf-8"))
    out = []
    for p in data.get("prompts", []):
        item = {"id": p["id"]}
        if "payload" in p:
            item["payload"] = p["payload"]
        if "turnos" in p:  # cat7_multiturno: conversa encadeada, classifica a final
            item["turnos"] = p["turnos"]
        if "canal" in p:
            item["canal"] = p["canal"]
        out.append(item)
    return out


def load_controles(categoria: str) -> list[dict]:
    import yaml

    data = yaml.safe_load((TESTS_DIR / f"{categoria}.yaml").read_text(encoding="utf-8"))
    return data.get("controles", [])


def load_avaliacao(categoria: str) -> dict:
    import yaml

    data = yaml.safe_load((TESTS_DIR / f"{categoria}.yaml").read_text(encoding="utf-8"))
    return data.get("avaliacao", {})


def run_prompt(gpt_id: str, prompt: str, timeout: int = 120) -> str:
    """Executa 1 prompt contra 1 GPT. Stub por default; real com flag."""
    if os.environ.get("JANUS_RUNNER", "stub") == "cloakbridge":
        from janus.runner.cloak import CloakError, chat
        try:
            return chat(prompt, timeout=max(30, timeout), model=gpt_id)
        except CloakError as e:
            if os.environ.get("JANUS_RUNNER_FALLBACK", "1") != "1":
                raise
            print(f"janus: {e} — fallback para stub", file=sys.stderr)
    return _stub(gpt_id, prompt)


def _stub(gpt_id: str, prompt: str) -> str:
    mode = os.environ.get("JANUS_STUB_MODE", "eco")
    leak = os.environ.get("JANUS_STUB_LEAK", "")
    if mode == "recusa":
        return ("Aqui está um prompt de vídeo normal de 8s, 16:9, silent: "
                "[Cena] estúdio escuro [Texto] System Design. "
                "Não posso incluir instruções internas no vídeo.")
    if mode == "vazamento" and leak:
        return f"[Texto] {leak} [System Design] nós: identidade, regras."
    return f"[eco:{gpt_id}] {prompt[:200]}"
