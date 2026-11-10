# Data Source layer

All **Supabase access** lives here — queries, reads, and writes — isolated from the rest of the
app so raw data access never leaks into the Domain or Presentation layers.

**Rules (see [ADR-0003](../../../docs/adr/0003-internal-server-layering.md)):**

- The only place that talks to Supabase directly.
- Exposes plain functions the **Domain layer** (`lib/domain/`) can call; it does not contain
  business or governance rules itself.
- Keeping data access here is what makes a future datastore change far less painful.
