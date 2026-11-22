import { describe, expect, it } from 'vitest';
import { allDemoRuns, DEMO_DRAFT_LABEL, runDemoPreset } from '@/lib/demo/demo-run';
import { SAMPLE_PRESETS } from '@/lib/demo/sample-org';
import { detectPii } from '@/lib/domain/pii';
import { AI_PROVENANCE } from '@/lib/domain/provenance';

// ADR-0029 T3: the demo's governed-run view model runs the REAL safety code on the sample texts,
// never shows the real AI label, and survives a bad preset id.

describe('runDemoPreset (ADR-0029 T3)', () => {
  it.each(SAMPLE_PRESETS.map((p) => [p.id]))(
    'strips all personal data from the %s request',
    (id) => {
      const run = runDemoPreset(id);
      expect(run).not.toBeNull();
      expect(detectPii(run!.pii.redactedRequest)).toEqual([]);
      expect(run!.pii.findings.length).toBeGreaterThan(0);
    },
  );

  it('describes what was found with the real summary sentence, naming the category', () => {
    // Asserts the category, not the exact sentence, so fixing the real sentence never breaks the demo.
    expect(runDemoPreset('donor')!.pii.summary).toContain('email address');
    expect(runDemoPreset('volunteer')!.pii.summary).toContain('phone number');
    expect(runDemoPreset('volunteer')!.pii.redactedRequest).toContain('[phone number removed]');
  });

  it('sends the partner draft to Human Review because the real rule-check flags it', () => {
    const run = runDemoPreset('partner')!;
    expect(run.ruleCheck.result).toBe('flag');
    expect(run.ruleCheck.reason).toContain('contact detail');
    expect(run.outcome).toEqual({ status: 'needs_review', label: 'Waiting for Human Review' });
  });

  it.each([['donor'], ['volunteer']])(
    'completes the %s run because the rule-check passes',
    (id) => {
      const run = runDemoPreset(id)!;
      expect(run.ruleCheck.result).toBe('pass');
      expect(run.outcome).toEqual({ status: 'completed', label: 'Completed' });
    },
  );

  it('labels every draft as prepared in advance, never with the real AI label', () => {
    expect(DEMO_DRAFT_LABEL).not.toContain(AI_PROVENANCE);
    expect(DEMO_DRAFT_LABEL).toContain('No AI ran');
    for (const preset of SAMPLE_PRESETS) {
      const run = runDemoPreset(preset.id)!;
      expect(run.draft.label).toBe(DEMO_DRAFT_LABEL);
      expect(run.draft.text).toBe(preset.preparedDraft);
    }
  });

  it('returns null for an unknown preset id', () => {
    expect(runDemoPreset('not-a-preset')).toBeNull();
    expect(runDemoPreset('')).toBeNull();
  });
});

describe('allDemoRuns (ADR-0029 T5)', () => {
  it('returns one finished run per preset, in picker order, with exactly one sent to review', () => {
    const runs = allDemoRuns();
    expect(runs.map((r) => r.preset.id)).toEqual(SAMPLE_PRESETS.map((p) => p.id));
    expect(runs.filter((r) => r.outcome.status === 'needs_review')).toHaveLength(1);
  });

  it('is plain data that survives the server-to-client hand-off unchanged', () => {
    const runs = allDemoRuns();
    expect(JSON.parse(JSON.stringify(runs))).toEqual(runs);
  });
});
