-- Epic 0 - Standards library content (ADR-0008, content track).
--
-- Seeds the three baseline frameworks and nine plain-language rules the policy seed
-- (Epic 1) and Governance Co-Pilot (Epic 4) build on. Rule text is OUR plain-language
-- synthesis (not quoted from the frameworks); each row cites its source at the precision
-- we can verify (NIST by function; EU AI Act by article; ISO 42001 by named control area).
-- Runs as a privileged migration (bypasses the read-only RLS). Idempotent via ON CONFLICT.
-- Rule text and citations are kept plain ASCII for portability across SQL clients.

-- The three baseline frameworks.
insert into standard (name, version, tier) values
  ('nist_ai_rmf', '1.0', 'baseline'),
  ('eu_ai_act', '2024/1689', 'baseline'),
  ('iso_42001', '2023', 'baseline')
on conflict (name, version) do nothing;

-- The nine rules, joined to their framework by name.
insert into standard_rule (standard_id, code, rule_text, category, risk_tier, citation)
select s.id, v.code, v.rule_text, v.category, v.risk_tier, v.citation
from (
  values
    ('nist_ai_rmf'::standard_name, 'nist-human-oversight',
     'A named person is accountable for each AI use and has the final say: AI assists, people decide.',
     'human-oversight', 'all', 'NIST AI RMF (2023), GOVERN function'),
    ('nist_ai_rmf'::standard_name, 'nist-document-use',
     'Write down what an AI use is for, its context, and who is responsible, before relying on it.',
     'accountability-logging', 'all', 'NIST AI RMF (2023), MAP function'),
    ('nist_ai_rmf'::standard_name, 'nist-check-output',
     'Check AI output for errors, bias, or harm (more carefully the higher the stakes) before acting on it.',
     'risk-tiering', 'high', 'NIST AI RMF (2023), MEASURE function'),
    ('eu_ai_act'::standard_name, 'euaiact-match-risk',
     'Match safeguards to the level of risk, and never use AI for banned purposes like manipulation or social scoring.',
     'risk-tiering', 'high', 'EU AI Act (Reg. (EU) 2024/1689), Article 5 (prohibited practices)'),
    ('eu_ai_act'::standard_name, 'euaiact-human-override',
     'For higher-risk uses, a person must be able to review, override, or stop the AI.',
     'human-oversight', 'high', 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)'),
    ('eu_ai_act'::standard_name, 'euaiact-disclose-ai',
     'Tell people when they are dealing with AI, and label AI-generated content.',
     'transparency-provenance', 'all', 'EU AI Act (Reg. (EU) 2024/1689), Article 50 (transparency)'),
    ('iso_42001'::standard_name, 'iso42001-data-governance',
     'Govern the data you put into AI: minimize it, check its quality, and protect sensitive information.',
     'data-protection', 'sensitive', 'ISO/IEC 42001:2023, Annex A (data governance controls)'),
    ('iso_42001'::standard_name, 'iso42001-managed-logging',
     'Run AI as a managed system: log how it is used and review it regularly.',
     'accountability-logging', 'all', 'ISO/IEC 42001:2023 (AI management system)'),
    ('iso_42001'::standard_name, 'iso42001-records',
     'Keep records that show how AI outputs were produced and overseen.',
     'transparency-provenance', 'all', 'ISO/IEC 42001:2023, Annex A (transparency and record-keeping controls)')
) as v (std_name, code, rule_text, category, risk_tier, citation)
join standard s on s.name = v.std_name
on conflict (code) do nothing;
