# ADR-002: PageForge schema-driven landing pages

## Decision
Use a schema-driven page builder (PageForge) with optional visual adapters (VisualForge) and static HTML output.

## Rationale
- Reduces duplicated page code across verticals.
- Keeps core agnostic of domain and visual libraries.
- Enables progressive enhancement and fallback.
- Supports performance budgets and accessibility by default.

## Consequences
- Requires strict schema validation.
- Visual adapters must be optional and lazy.
- Generated pages need hydration for interactive constructs.
