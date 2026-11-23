-- One-time cleanup: remove personal details from PAST Co-Pilot runs' stored summaries
-- (card "Strip personal details in the Co-Pilot before the AI sees them", PR 2).
--
-- WHY: until PR #116, the Co-Pilot stored the first 200 characters of a person's text in
-- `task_run.input_summary` exactly as typed, and that summary is shown in the Human Review queue.
-- New runs are now redacted in code (`lib/domain/copilot-pipeline.ts`). This cleans the rows that
-- were written before, so the "How we handle your data" page can say "removed" without an
-- exception.
--
-- WHAT THIS DOES: for Co-Pilot runs only (skill key `governance_copilot`), it replaces, in order,
--   1. email addresses        → [email removed]
--   2. phone numbers          → [phone number removed]
--   3. US Social Security nos → [SSN removed]
--   4. card-like digit runs   → [card number removed]
-- using the same patterns and placeholders as `redactPii` in `lib/domain/pii.ts` (a static test,
-- `test/copilot-clean-past-input.test.ts`, keeps them in step). Skill runs are NOT touched: they
-- were always stored redacted.
--
-- ONE DIFFERENCE FROM THE APP: the app only removes a 13–19 digit run when it passes the card
-- checksum (Luhn). SQL can't easily check that, so here EVERY 13–19 digit run is removed. That can
-- over-remove a long number that wasn't a card. For a privacy cleanup, removing too much is the
-- safe direction.
--
-- WHAT IT DOESN'T DO:
--   - It doesn't add audit entries for the cleanup (the record of each run is unchanged; this is a
--     one-time data correction, recorded in this file, the handover log and the card).
--   - It can't recover what Anthropic received at the time; their API keeps inputs for up to 30
--     days by default (see the data-page fact sheet, C2).
--   - Names, street addresses and health details were never detected (card "Detect more kinds of
--     personal details"), so they aren't removed here either.
--
-- HOW TO RUN: Supabase SQL Editor → paste → Run → "Run without RLS". Safe to re-run: a second run
-- finds nothing left to change. Check the result with `supabase/checks/copilot-clean-check.sql`
-- (read-only), before and after.

update public.task_run t
set input_summary =
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          t.input_summary,
          '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email removed]', 'g'),
        '(\(\d{3}\)\s*|\m\d{3}[-.\s])\d{3}[-.\s]\d{4}\M', '[phone number removed]', 'g'),
      '\m\d{3}-\d{2}-\d{4}\M', '[SSN removed]', 'g'),
    '\m(\d[ -]?){12,18}\d\M', '[card number removed]', 'g')
from public.skill s
where t.skill_id = s.id
  and s.key = 'governance_copilot'
  and t.input_summary is not null
  and t.input_summary ~ (
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    || '|(\(\d{3}\)\s*|\m\d{3}[-.\s])\d{3}[-.\s]\d{4}\M'
    || '|\m\d{3}-\d{2}-\d{4}\M'
    || '|\m(\d[ -]?){12,18}\d\M'
  );
