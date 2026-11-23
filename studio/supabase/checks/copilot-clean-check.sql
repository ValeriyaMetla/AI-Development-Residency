-- Past Co-Pilot runs — personal-details check (READ-ONLY).
-- Card "Strip personal details in the Co-Pilot before the AI sees them", PR 2.
--
-- WHAT IT DOES: counts Co-Pilot runs whose stored summary still contains something that looks like
-- an email, phone number, US SSN or card number. It shows COUNTS ONLY — never the text itself, so
-- running it doesn't put anyone's details on your screen. It changes nothing.
--
-- HOW TO USE:
--   1. BEFORE the migration: run this to see how many past runs will be cleaned.
--   2. Run `20261123100000_copilot_clean_past_input.sql`.
--   3. AFTER: run this again. Every count should be 0.
--
-- Supabase SQL Editor → paste → Run. (If asked about RLS, "Run without RLS".)

with copilot_runs as (
  select t.input_summary as s
  from public.task_run t
  join public.skill s on s.id = t.skill_id
  where s.key = 'governance_copilot' and t.input_summary is not null
)
select
  count(*)                                                                       as copilot_runs,
  count(*) filter (where s ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')    as with_email,
  count(*) filter (where s ~ '(\(\d{3}\)\s*|\m\d{3}[-.\s])\d{3}[-.\s]\d{4}\M')     as with_phone,
  count(*) filter (where s ~ '\m\d{3}-\d{2}-\d{4}\M')                             as with_ssn,
  count(*) filter (where s ~ '\m(\d[ -]?){12,18}\d\M')                            as with_card_like,
  case
    when count(*) filter (where
      s ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
      or s ~ '(\(\d{3}\)\s*|\m\d{3}[-.\s])\d{3}[-.\s]\d{4}\M'
      or s ~ '\m\d{3}-\d{2}-\d{4}\M'
      or s ~ '\m(\d[ -]?){12,18}\d\M') = 0
    then 'PASS — no personal details left in past Co-Pilot summaries'
    else 'NOT CLEAN — run the migration (or send these counts)'
  end                                                                            as result
from copilot_runs;
