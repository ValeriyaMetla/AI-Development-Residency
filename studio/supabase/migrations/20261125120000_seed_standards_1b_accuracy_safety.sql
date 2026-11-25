-- Release 1b - Standards library content: accuracy/grounding, high-stakes boundaries,
-- and a dedicated no-scoring prohibition (ADR-0008 content track, ADR-0042).
--
-- Extends the Epic-0 nine-rule seed (20261113010000_seed_standards.sql) with six rules the
-- 1b slice needs. Rule text is OUR plain-language synthesis (NOT quoted from the frameworks);
-- each row cites its source at the precision we can verify. These rows are the catalog entries;
-- wiring them into the Co-Pilot (Track A) and the policy seed / Challenger (Track B) is done in
-- separate code changes. Until a human verifies each cited passage, these ride labeled
-- AI-suggested at the provenance layer (the sourcing gate).
--
-- Runs as a privileged migration (bypasses the read-only RLS), like the Epic-0 seed. Idempotent
-- via ON CONFLICT (code). No schema change: `category` is free text (ADR-0008), so the new
-- `accuracy-grounding` category needs no migration to the enum. Rule text and citations are plain
-- ASCII for portability across SQL clients.

insert into standard_rule (standard_id, code, rule_text, category, risk_tier, citation)
select s.id, v.code, v.rule_text, v.category, v.risk_tier, v.citation
from (
  values
    -- Accuracy and grounding (new category) -------------------------------------------------
    ('nist_ai_rmf'::standard_name, 'nist-uncertainty',
     'When something is uncertain or unverified, say so plainly: separate confirmed facts from guesses, and never invent a confidence figure.',
     'accuracy-grounding', 'high', 'NIST AI RMF (2023), MAP function (document knowledge limits)'),
    ('nist_ai_rmf'::standard_name, 'nist-safe-abstention',
     'When the evidence is not enough to answer safely, hold back the unsupported part, say why, and point to a verified next step instead of guessing.',
     'accuracy-grounding', 'high', 'NIST AI RMF (2023), MEASURE function (fail safely beyond knowledge limits)'),
    ('nist_ai_rmf'::standard_name, 'nist-source-traceability',
     'Tie each external factual claim to a real, checkable source, and never fabricate a citation.',
     'transparency-provenance', 'high', 'NIST AI 600-1 Generative AI Profile (2024), MS-2.5 (output provenance)'),
    -- High-stakes boundary ------------------------------------------------------------------
    ('nist_ai_rmf'::standard_name, 'nist-high-stakes-boundary',
     'Keep AI within what it can verify and is authorized to do: it can help someone prepare, but must not diagnose, guarantee eligibility, or replace a professional decision.',
     'risk-tiering', 'high', 'NIST AI RMF (2023), MAP function (intended use and knowledge limits)'),
    -- Capability and limitation disclosure --------------------------------------------------
    ('nist_ai_rmf'::standard_name, 'nist-capability-limits',
     'State plainly what the AI can and cannot do or verify, so people do not over-rely on it.',
     'transparency-provenance', 'all', 'NIST AI RMF (2023), MAP function (capabilities and limitations)'),
    -- Dedicated no-scoring prohibition (ADR-0042) -------------------------------------------
    ('eu_ai_act'::standard_name, 'euaiact-no-scoring',
     'Never use AI to score, rank, or predict outcomes about a person (eligibility, risk, deservingness, or who gets help): keep AI on the work, not on judging people.',
     'risk-tiering', 'all', 'EU AI Act (Reg. (EU) 2024/1689), Article 5 (prohibited practices)')
) as v (std_name, code, rule_text, category, risk_tier, citation)
join standard s on s.name = v.std_name
on conflict (code) do nothing;
