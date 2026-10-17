# Giants Registry

Place to catalog competitors, references, and giants whose patterns can be reused.

## Rules
- Never vendor proprietary code.
- Record license before coupling.
- Prefer adopt/adapt over avoid/monitor.
- Use `canCouple()` before integrating.
- Keep patterns, not copies.

## Usage
```ts
import { loadRegistry, rankGiants, canCouple } from "@hub/giants";

const registry = loadRegistry(require("./registry.json"));
const candidates = rankGiants(registry.giants, "seo");
const coupleable = candidates.filter(canCouple);
```
