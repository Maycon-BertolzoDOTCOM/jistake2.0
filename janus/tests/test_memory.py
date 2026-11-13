import json
from pathlib import Path

import pytest

from janus.queue import memory


def test_put_page_and_inbox(tmp_path):
    root = tmp_path / "mem"
    cfg = {"ai_memory_root": str(root)}
    page = memory.put_page(root, "p1", "Title", "content", tags=["t"], author="u")
    assert page.exists()
    msg = memory.inbox_post(root, {
        "from": {"id": "a", "kind": "system"},
        "to": "agents",
        "type": "status",
        "subject": "s",
        "body": "b",
        "priority": "high",
    })
    assert msg["id"] == "msg-1"
    items = json.loads((root / "inbox" / "inbox.json").read_text())
    assert len(items) == 1
    assert items[0]["priority"] == "high"


def test_handoff_single_claim(tmp_path):
    root = tmp_path / "mem"
    b = memory.create_baton(root, "t", "owner", {"x": 1}, ["a"])
    assert memory.claim_baton(root, b["id"], "agent1")["success"] is True
    assert memory.claim_baton(root, b["id"], "agent2")["success"] is False
    assert memory.complete_baton(root, b["id"], "agent1")["success"] is True


def test_record_job_result_noop_without_root(tmp_path):
    assert memory.record_job_result({"link": "x"}, {"status": "concluido"}, {"id": "g"}, {}) is None


def test_record_job_result_writes(tmp_path):
    root = tmp_path / "mem"
    cfg = {"ai_memory_root": str(root)}
    out = memory.record_job_result(
        {"link": "https://x", "categorias": ["cat1"]},
        {"status": "concluido", "taxa_falha": 0.0, "achados": [], "resultados": {}},
        {"id": "g1"},
        cfg,
    )
    assert out is not None
    assert (root / "pages").exists()
    assert (root / "batons").exists()
    assert (root / "inbox" / "inbox.json").exists()
