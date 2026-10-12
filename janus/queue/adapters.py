"""JANUS — adapters de fila. v1: FileQueueAdapter (YAML)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

import yaml


class QueueAdapter(ABC):
    @abstractmethod
    def enqueue(self, item: dict) -> None: ...
    @abstractmethod
    def listar(self) -> list[dict]: ...
    @abstractmethod
    def complete(self, link: str, resultado: dict) -> None: ...


class FileQueueAdapter(QueueAdapter):
    """Fila em YAML (janus/queue/fila.yaml)."""

    def __init__(self, path: str | Path | None = None):
        self.path = Path(path or Path(__file__).parent / "fila.yaml")

    def _doc(self) -> dict:
        return yaml.safe_load(self.path.read_text(encoding="utf-8"))

    def _save(self, doc: dict) -> None:
        self.path.write_text(yaml.safe_dump(doc, allow_unicode=True, sort_keys=False), encoding="utf-8")

    def config(self) -> dict:
        return self._doc().get("config", {})

    def listar(self) -> list[dict]:
        return self._doc().get("fila", [])

    def enqueue(self, item: dict) -> None:
        doc = self._doc()
        if any(f.get("link") == item.get("link") for f in doc.get("fila", [])):
            return  # idempotente
        doc.setdefault("fila", []).append(item)
        self._save(doc)

    def complete(self, link: str, resultado: dict) -> None:
        doc = self._doc()
        doc["fila"] = [f for f in doc.get("fila", []) if f.get("link") != link]
        self._save(doc)


class RedisQueueAdapter(QueueAdapter):  # feat/queue-redis
    def __init__(self, *a, **k):
        raise NotImplementedError("fora de escopo v1 — ver feat/queue-redis")

    def enqueue(self, item): raise NotImplementedError
    def listar(self): raise NotImplementedError
    def complete(self, link, resultado): raise NotImplementedError
