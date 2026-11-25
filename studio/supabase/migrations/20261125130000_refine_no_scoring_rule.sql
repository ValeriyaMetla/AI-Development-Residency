-- ADR-0043: refine the no-scoring rule to allow human-governed prioritization.
--
-- Narrows the prohibition from a blanket "never score/rank" to "AI must not MAKE the determination
-- about a person", while permitting AI to support a human-run, explicitly-governed prioritization.
-- Aligns the citation to the EU AI Act's actual structure: Article 5 (social scoring) + Article 14
-- (human oversight). Updates the existing `euaiact-no-scoring` row seeded by
-- 20261125120000_seed_standards_1b_accuracy_safety.sql. Idempotent (an UPDATE by stable code).
-- Plain ASCII for portability.

update standard_rule
set
  rule_text = 'AI must not make or predict a judgment about a person (who is eligible, at risk, deserving, or likely to succeed, or who receives help). It may organize information and apply an organization''s own written prioritization rules to support a person, but a named person makes the determination.',
  citation = 'EU AI Act (Reg. (EU) 2024/1689), Article 5 (social scoring) and Article 14 (human oversight)'
where code = 'euaiact-no-scoring';
