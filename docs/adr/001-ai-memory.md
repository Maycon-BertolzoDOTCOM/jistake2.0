# ADR-001: AI-memory as shared context plane
Decision: use ai-memory (OKF, local embeddings, single-writer) as durable context plane for agents and Hub SOPs.
Rationale: portability across harnesses/machines, audit continuity, avoids lost quota states; Git-friendly OKF; local embeddings avoid external dependencies.
Tradeoffs: shared storage requires auth, private subnet, backups; no per-page ACL by design (attribution + history).
