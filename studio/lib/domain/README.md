# Domain layer

The **crown jewel** — the app's core business and governance logic, written as pure,
deterministic functions: the governed-run pipeline, guardrail checks, risk-tiering, and policy
logic.

**Rules (see [ADR-0003](../../../docs/adr/0003-internal-server-layering.md)):**
- No HTTP objects and no Supabase SDK calls here — this layer is framework- and database-free.
- Reads/writes go through the **Data Source layer** (`lib/data/`), never directly.
- Nothing in Presentation (`app/` UI) may hold logic that belongs here (the Leak Test).

This is what makes the guardrails provably server-side and unit-testable.
