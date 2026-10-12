"""JANUS — selagem forense de relatórios (Sigil, frente A).

Uso: python3 janus/relatorios/selar.py <relatorio.md>
Blinda via SigilClient (stack :8080) e grava <relatorio>.sigil.json
(hash, manifest, autor) ao lado. Sem stack → exit 3, sem falhar o PoC.
Cadeia de custódia (FAILURE_TAXONOMY I2): o hash vai para o rodapé do relatório.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import sys
from pathlib import Path


async def selar(path: Path) -> dict:
    sys.path.insert(0, "/home/vector/trama")
    try:
        from soc.gateway.sigil import SigilClient
    except Exception as e:
        return {"ok": False, "motivo": f"SigilClient indisponível: {e}"}
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    try:
        client = SigilClient()
        out = path.with_name(f"blinded_{path.name}")
        res = await client.blind(str(path), str(out), author="janus",
                                 project_id=f"achado:{path.parent.name}")
        sidecar = {"relatorio": path.name, "sha256_original": sha,
                   "blinded": out.name, "sigil": res}
    except Exception as e:
        return {"ok": False, "motivo": f"stack Sigil fora do ar? {e}", "sha256_original": sha}
    path.with_suffix(path.suffix + ".sigil.json").write_text(
        json.dumps(sidecar, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, **sidecar}


if __name__ == "__main__":
    r = asyncio.run(selar(Path(sys.argv[1])))
    print(json.dumps(r, ensure_ascii=False, indent=2)[:1500])
    sys.exit(0 if r["ok"] else 3)
