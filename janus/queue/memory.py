"""JANUS — ponte para AI-memory (OKF + inbox + handoff baton).

v1 é local: grava Markdown OKF + JSON em `ai_memory_root`.
Se `ai_memory_root` não estiver configurado (cfg/env), vira no-op.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _root(cfg: dict | None) -> Path | None:
    if isinstance(cfg, dict):
        raw = cfg.get("ai_memory_root")
        if raw:
            return Path(str(raw))
    raw = os.environ.get("AI_MEMORY_ROOT")
    if raw:
        return Path(raw)
    return None


def _slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-") or "item"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _ensure(root: Path) -> None:
    for sub in ("pages", "inbox", "batons"):
        (root / sub).mkdir(parents=True, exist_ok=True)


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def put_page(root: Path, page: str, title: str, content: str,
             tags: list[str] | None = None, author: str = "janus-worker") -> Path:
    _ensure(root)
    tags = tags or []
    front = [
        "---",
        f"title: {title}",
        f"page: {page}",
        f"author: {author}",
        f"updated_at: {_now()}",
        f"tags: [{', '.join(tags)}]",
        "---",
        "",
    ]
    path = root / "pages" / f"{_slug(page)}.md"
    _write(path, "\n".join(front) + content + "\n")
    return path


def inbox_post(root: Path, message: dict[str, Any]) -> dict[str, Any]:
    _ensure(root)
    path = root / "inbox" / "inbox.json"
    items = _read_json(path, [])
    if not isinstance(items, list):
        items = []
    item = {
        "id": f"msg-{len(items) + 1}",
        "created_at": _now(),
        "acked_by": [],
        **message,
    }
    items.append(item)
    _write(path, json.dumps(items, ensure_ascii=False, indent=2))
    return item


def create_baton(root: Path, title: str, owner: str, payload: dict[str, Any],
                 steps: list[str] | None = None) -> dict[str, Any]:
    _ensure(root)
    baton = {
        "id": f"baton-{_now().replace(':', '-')}",
        "title": title,
        "owner": owner,
        "status": "pending",
        "created_at": _now(),
        "updated_at": _now(),
        "payload": payload,
        "steps": steps or [],
    }
    path = root / "batons" / f"{_slug(baton['id'])}.json"
    _write(path, json.dumps(baton, ensure_ascii=False, indent=2))
    return baton


def claim_baton(root: Path, baton_id: str, actor: str) -> dict[str, Any]:
    path = root / "batons" / f"{_slug(baton_id)}.json"
    baton = _read_json(path, None)
    if not isinstance(baton, dict):
        return {"success": False, "reason": "not-found"}
    if baton.get("status") in ("claimed", "done"):
        return {"success": False, "reason": "already-claimed"}
    baton["status"] = "claimed"
    baton["claimed_by"] = actor
    baton["updated_at"] = _now()
    _write(path, json.dumps(baton, ensure_ascii=False, indent=2))
    return {"success": True, "baton": baton}


def complete_baton(root: Path, baton_id: str, actor: str) -> dict[str, Any]:
    path = root / "batons" / f"{_slug(baton_id)}.json"
    baton = _read_json(path, None)
    if not isinstance(baton, dict):
        return {"success": False, "reason": "not-found"}
    baton["status"] = "done"
    baton.setdefault("claimed_by", actor)
    baton["updated_at"] = _now()
    _write(path, json.dumps(baton, ensure_ascii=False, indent=2))
    return {"success": True, "baton": baton}


def record_job_result(item: dict, result: dict, gpt: dict | None, cfg: dict | None) -> dict[str, Any] | None:
    root = _root(cfg)
    if root is None:
        return None
    _ensure(root)
    gpt_id = (gpt or {}).get("id", "unknown")
    link = item.get("link", "")
    status = result.get("status", "unknown")
    page = f"job-{gpt_id}-{_slug(link)[:40]}"
    content = "\n".join([
        f"# Job {gpt_id}",
        "",
        f"- Link: {link}",
        f"- Status: {status}",
        f"- Categorias: {', '.join(item.get('categorias', []))}",
        f"- Taxa de falha: {result.get('taxa_falha', 'n/a')}",
        f"- Achados: {len(result.get('achados', []) or [])}",
        f"- Erro: {result.get('erro', '')}",
        "",
        "## Resultado",
        "```json",
        json.dumps(result, ensure_ascii=False, indent=2),
        "```",
    ])
    page_path = put_page(root, page, f"Job {gpt_id}", content,
                         tags=["job", status, gpt_id], author="janus-worker")
    baton = create_baton(
        root,
        title=f"Resume {gpt_id}",
        owner="janus-worker",
        payload={"link": link, "status": status, "result": result},
        steps=["re-run gated categories", "compare findings", "publish report"],
    )
    inbox_post(root, {
        "from": {"id": "janus-worker", "kind": "system"},
        "to": "agents",
        "type": "result" if status == "concluido" else "handoff",
        "subject": f"{gpt_id}: {status}",
        "body": f"Job {status}. Baton={baton['id']}. Page={page_path.name}",
        "priority": "high" if status != "concluido" else "normal",
    })
    return {"page": str(page_path), "baton": baton["id"]}
