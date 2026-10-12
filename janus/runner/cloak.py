"""JANUS — cliente do CloakBridge (execução real contra webchat).

Fala com o sidecar OpenAI-compat (`POST {base}/v1/chat/completions`,
`{model, messages:[{role:user,content}]}` → `choices[0].message.content`).
Só stdlib (urllib) — nenhuma dependência nova (§7 do README Janus).

Env:
  CLOAKBRIDGE_URL   base do sidecar (default http://127.0.0.1:9301)
  JANUS_CLOAK_MODEL model/target no CloakBridge (default jis-take-2.0)
"""

from __future__ import annotations

import json
import os
import urllib.request

BASE = os.environ.get("CLOAKBRIDGE_URL", "http://127.0.0.1:9301")
MODEL = os.environ.get("JANUS_CLOAK_MODEL", "jis-take-2.0")


class CloakError(RuntimeError):
    pass


def chat(prompt: str, timeout: int = 180, model: str | None = None,
         base: str | None = None) -> str:
    """1 prompt → texto da resposta. Levanta CloakError em qualquer falha."""
    body = json.dumps({"model": model or MODEL,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request((base or BASE).rstrip("/") + "/v1/chat/completions",
                                 data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        raise CloakError(f"cloakbridge indisponível: {e}")
    try:
        texto = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise CloakError(f"resposta inesperada do cloakbridge: {e}")
    return (texto or "").strip()
