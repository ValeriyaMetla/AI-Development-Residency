import { describe, expect, it } from 'vitest';
import { AUDIT_EVENT_TYPES } from '@/lib/domain/audit-events';
import {
  actorLabel,
  detectRunGaps,
  eventWording,
  extractDetail,
  isActorMe,
  OTHER_EVENT_WORDING,
  RUN_GAP_MARKER,
  type AuditDetail,
  type RunForGap,
} from '@/lib/domain/report';

const empty: AuditDetail = {};

describe('eventWording — coverage (card 1 US2)', () => {
  it('every known kind has wording and none falls through to "Other"', () => {
    for (const type of AUDIT_EVENT_TYPES) {
      const line = eventWording({ type, detail: empty });
      expect(line, `kind "${type}" has no wording`).not.toBe(OTHER_EVENT_WORDING);
      expect(line.length, `kind "${type}" is blank`).toBeGreaterThan(0);
    }
  });

  it('an unrecognized kind is shown as "Other recorded event", not hidden', () => {
    expect(eventWording({ type: 'some_future_event', detail: empty })).toBe(OTHER_EVENT_WORDING);
    expect(eventWording({ type: '', detail: empty })).toBe(OTHER_EVENT_WORDING);
  });
});

describe('eventWording — the approved copy', () => {
  it('PII lines name the categories, with a safe fallback', () => {
    expect(eventWording({ type: 'pii_stripped', detail: { categories: ['email', 'phone'] } })).toBe(
      'Personal details removed before the AI saw them — email, phone',
    );
    expect(eventWording({ type: 'pii_kept', detail: {} })).toBe(
      'Personal details kept by the person’s choice — personal details',
    );
  });

  it('a finished run distinguishes completed from sent-for-review', () => {
    expect(eventWording({ type: 'task_completed', detail: { outcome: 'completed' } })).toBe(
      'Run finished — completed',
    );
    expect(eventWording({ type: 'task_completed', detail: { outcome: 'needs_review' } })).toBe(
      'Run finished — sent for review',
    );
  });

  it('approval reflects whether the draft was edited (ADR-0022)', () => {
    expect(eventWording({ type: 'task_approved', detail: {} })).toBe('Approved by a person');
    expect(eventWording({ type: 'task_approved', detail: { edited: true } })).toBe(
      'Edited and approved by a person',
    );
  });

  it('a correction and a note are distinct, and never carry text', () => {
    expect(
      eventWording({ type: 'task_run_corrected', detail: { correctionKind: 'correction' } }),
    ).toBe('Correction added');
    expect(eventWording({ type: 'task_run_corrected', detail: { correctionKind: 'note' } })).toBe(
      'Note added',
    );
  });

  it('Co-Pilot assessment shows verdict + tier when present, and degrades cleanly', () => {
    expect(
      eventWording({ type: 'copilot_assessed', detail: { verdict: 'Allowed', riskTier: 'Low' } }),
    ).toBe('Co-Pilot assessment — Allowed, Low');
    expect(eventWording({ type: 'copilot_assessed', detail: {} })).toBe('Co-Pilot assessment');
  });

  it('policy lines pluralize the rule count and omit it when unknown', () => {
    expect(eventWording({ type: 'policy_seeded', detail: { ruleCount: 1 } })).toBe(
      'AI policy created — 1 rule',
    );
    expect(eventWording({ type: 'policy_edited', detail: { ruleCount: 5 } })).toBe(
      'AI policy updated — new version with 5 rules',
    );
    expect(eventWording({ type: 'policy_seeded', detail: {} })).toBe('AI policy created');
  });

  it('the two rule-suggestion kinds have their own wording', () => {
    expect(eventWording({ type: 'rule_suggestion_accepted', detail: {} })).toBe(
      'Suggested rule accepted — added to the policy as a new version',
    );
    expect(eventWording({ type: 'rule_suggestion_dismissed', detail: {} })).toBe(
      'Suggested rule dismissed',
    );
  });
});

describe('actorLabel — no names in 1b (card 1 Q1)', () => {
  it('maps to "You" / "Another team member" only', () => {
    expect(actorLabel('you')).toBe('You');
    expect(actorLabel('other')).toBe('Another team member');
  });

  it('isActorMe is true only for my own id, never for a removed (null) actor', () => {
    expect(isActorMe('user-1', 'user-1')).toBe(true);
    expect(isActorMe('user-2', 'user-1')).toBe(false);
    expect(isActorMe(null, 'user-1')).toBe(false);
  });
});

describe('detectRunGaps — gaps are visible, not invented (US5)', () => {
  const runs: RunForGap[] = [
    { id: 'r-finished', status: 'completed' },
    { id: 'r-blocked', status: 'blocked' },
    { id: 'r-missing', status: 'completed' }, // final outcome, but no terminal event below
    { id: 'r-running', status: 'running' }, // not final — never a gap
  ];

  it('flags a finished/stopped run whose terminal entry is missing', () => {
    const events = [
      { type: 'task_completed', taskRunId: 'r-finished' },
      { type: 'task_blocked', taskRunId: 'r-blocked' },
      { type: 'pii_stripped', taskRunId: 'r-missing' }, // has an event, but not a terminal one
    ];
    const gaps = detectRunGaps(runs, events);
    expect(gaps.has('r-missing')).toBe(true);
    expect(gaps.has('r-finished')).toBe(false);
    expect(gaps.has('r-blocked')).toBe(false);
    expect(gaps.has('r-running')).toBe(false);
  });

  it('a still-running run with no terminal event is not a gap', () => {
    expect(detectRunGaps([{ id: 'r', status: 'running' }], []).size).toBe(0);
  });

  it('ignores terminal events with no run id', () => {
    const gaps = detectRunGaps(
      [{ id: 'r-missing', status: 'completed' }],
      [{ type: 'task_completed', taskRunId: null }],
    );
    expect(gaps.has('r-missing')).toBe(true);
  });
});

describe('counter-metric — no content ever reaches the trail (card 1)', () => {
  // A payload stuffed with sensitive content under both plausible and junk keys. Only the
  // allow-listed keys (categories, kind, verdict, tier, ruleCount) carry benign values.
  const SECRET = 'John Doe — SSN 123-45-6789 — the draft text the AI wrote — private note body';
  const hostilePayload: Record<string, unknown> = {
    inputText: SECRET,
    input_summary: SECRET,
    draft: SECRET,
    output: SECRET,
    note: SECRET,
    noteText: SECRET,
    content: SECRET,
    reason: SECRET,
    patterns: [SECRET],
    categories: ['email', 'phone'],
    kind: 'note',
    verdict: 'Allowed',
    tier: 'Low',
    ruleCount: 3,
  };

  it('extractDetail drops every non-allow-listed field, for every known kind', () => {
    for (const type of AUDIT_EVENT_TYPES) {
      const detail = extractDetail(type, hostilePayload, {
        edited: true,
        runStatus: 'needs_review',
      });
      const serialized = JSON.stringify(detail);
      expect(serialized, `kind "${type}" leaked content into detail`).not.toContain(SECRET);
      // And the rendered line never contains it either.
      expect(
        eventWording({ type, detail }),
        `kind "${type}" leaked content into wording`,
      ).not.toContain(SECRET);
    }
  });

  it('an unknown kind carries no detail and no content', () => {
    const detail = extractDetail('future_kind', hostilePayload);
    expect(JSON.stringify(detail)).toBe('{}');
    expect(eventWording({ type: 'future_kind', detail })).toBe(OTHER_EVENT_WORDING);
  });

  it('only the allow-listed detail keys are ever populated', () => {
    const allowed = new Set([
      'categories',
      'outcome',
      'edited',
      'correctionKind',
      'verdict',
      'riskTier',
      'ruleCount',
    ]);
    for (const type of AUDIT_EVENT_TYPES) {
      const detail = extractDetail(type, hostilePayload, { edited: false, runStatus: 'completed' });
      for (const key of Object.keys(detail)) {
        expect(allowed.has(key), `kind "${type}" produced unexpected detail key "${key}"`).toBe(
          true,
        );
      }
    }
  });
});

describe('exported constants', () => {
  it('the gap marker never claims completeness', () => {
    expect(RUN_GAP_MARKER.toLowerCase()).not.toMatch(/complete|verified|all/);
  });
});
