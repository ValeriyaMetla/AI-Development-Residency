-- Release 1b - Accuracy category: evidence grounding (AGI-001).
--
-- Adds one standard_rule row that completes the "cheap" part of the accuracy-grounding category
-- (alongside nist-uncertainty / nist-safe-abstention from 20261125120000). Rule text is OUR
-- plain-language synthesis, cited at verifiable precision. Wired into the policy seed / Challenger
-- (Track B) as an always-on baseline; it is not a Co-Pilot risk signal.
--
-- Runs as a privileged migration (bypasses the read-only RLS). Idempotent via ON CONFLICT (code).
-- Plain ASCII.

insert into standard_rule (standard_id, code, rule_text, category, risk_tier, citation)
select s.id, v.code, v.rule_text, v.category, v.risk_tier, v.citation
from (
  values
    ('nist_ai_rmf'::standard_name, 'nist-evidence-grounding',
     'Back material factual claims with evidence from a reviewed source, keep confirmed facts separate from inference, and do not invent details when the evidence is not there.',
     'accuracy-grounding', 'high', 'NIST AI 600-1 Generative AI Profile (2024), MS-2.5 (grounding of claims)')
) as v (std_name, code, rule_text, category, risk_tier, citation)
join standard s on s.name = v.std_name
on conflict (code) do nothing;
