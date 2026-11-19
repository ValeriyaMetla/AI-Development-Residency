import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PolicyRule, Policy, NewPolicyRule } from '@/lib/data/policy';

/**
 * Verify a rule change propagates (Epic 1 · Policy inheritance · Chunk 4).
 *
 * Card: "Confirm a rule edit changes the next task's behavior with no redeploy." These tests run the
 * REAL edit path end to end — publishEditedPolicy (ADR-0024) -> the policy writers -> the next
 * runGovernedSkill -> the policy readers — inside one process with no module reload (the in-process
 * equivalent of "no redeploy").
 *
 * What is faked: only the I/O edges. Claude and the run writers are mocks; the policy Data-Source is
 * a small in-memory store shared by the writers (publish side) and the readers (pipeline side), so a
 * publish genuinely becomes what the next run reads. All Domain logic runs for real: rule assembly,
 * withPolicyContext, self-critique, and the deterministic rule-check.
 *
 * Why grounding, not the guardrail decision, is the main proof: the only policy-sensitive
 * deterministic check (contactDetailCheck, ADR-0014) keys on a `data-protection` rule, which in a
 * seeded policy is a locked baseline rule (q3 -> iso42001-data-governance). The editor keeps an
 * edited rule's category and gives added rules category `custom`, so no editor action can switch
 * that check on or off. An edit therefore changes behavior through the policy text folded into the
 * draft prompt and the self-critique prompt — which is what these tests assert — and the baseline
 * guardrail is shown to SURVIVE an edit.
 *
 * Known limit: the fake mirrors activatePolicy's archive-then-activate contract. The real
 * one-active-per-org guarantee is the DB's partial unique index (ADR-0009), not exercised here.
 */

// --- In-memory policy store (shared by the policy writers and readers) ----------------------------

const store = vi.hoisted(() => ({
  policies: [] as Policy[],
  rules: [] as PolicyRule[],
  seq: 0,
  failActivate: false,
}));

vi.mock('@/lib/data/policy', () => ({
  getActivePolicy: async (orgId: string) =>
    store.policies.find((p) => p.orgId === orgId && p.status === 'active') ?? null,
  getPolicyRules: async (policyId: string) => store.rules.filter((r) => r.policyId === policyId),
  // The pipeline reads rules via getPolicyRulesOrNull (ADR-0027); the in-memory store never errors,
  // so it mirrors getPolicyRules and never returns null.
  getPolicyRulesOrNull: async (policyId: string) =>
    store.rules.filter((r) => r.policyId === policyId),
  createPolicy: async (params: { orgId: string; name: string; status?: Policy['status'] }) => {
    const id = `policy-${++store.seq}`;
    store.policies.push({
      id,
      orgId: params.orgId,
      name: params.name,
      status: params.status ?? 'draft',
      createdAt: '2026-11-18',
    });
    return id;
  },
  insertPolicyRules: async (policyId: string, rules: NewPolicyRule[]) => {
    for (const r of rules) {
      store.rules.push({
        id: `rule-${++store.seq}`,
        policyId,
        ruleText: r.ruleText,
        standardRuleId: r.standardRuleId ?? null,
        citation: r.citation ?? null,
        category: r.category,
        riskTier: r.riskTier,
        origin: r.origin,
        isBaselineSafety: r.isBaselineSafety ?? false,
        needsReview: r.needsReview ?? false,
        sourceQuestion: r.sourceQuestion ?? null,
        suggestionKey: r.suggestionKey ?? null,
        createdAt: '2026-11-18',
      });
    }
    return true;
  },
  // Mirrors the real contract: archive the org's active policy, then activate the target.
  activatePolicy: async (params: { orgId: string; policyId: string }) => {
    if (store.failActivate) return false;
    for (const p of store.policies) {
      if (p.orgId === params.orgId && p.status === 'active') p.status = 'archived';
    }
    const target = store.policies.find((p) => p.id === params.policyId);
    if (!target) return false;
    target.status = 'active';
    return true;
  },
}));

// --- I/O edges: Claude + run writers ---------------------------------------------------------------

vi.mock('@/lib/data/claude', () => ({ draftWithClaude: vi.fn() }));
vi.mock('@/lib/data/runs', () => ({
  getSkillByKey: vi.fn(),
  createTaskRun: vi.fn(),
  updateTaskRunStatus: vi.fn(),
  saveTaskOutput: vi.fn(),
  saveGuardrailCheck: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
// Accept-a-suggestion path (ADR-0025): the surfaced suggestion and the decision write are edges here;
// the publish + next-run read go through the real code and the in-memory policy store.
vi.mock('@/lib/domain/rule-suggestion-service', () => ({ getRuleSuggestions: vi.fn() }));
vi.mock('@/lib/data/suggestions', () => ({ recordSuggestionDecision: vi.fn(async () => true) }));

import { draftWithClaude } from '@/lib/data/claude';
import { getSkillByKey, createTaskRun } from '@/lib/data/runs';
import {
  createPolicy,
  insertPolicyRules,
  activatePolicy,
  getActivePolicy,
  getPolicyRules,
} from '@/lib/data/policy';
import { runGovernedSkill } from '@/lib/domain/pipeline';
import { publishEditedPolicy } from '@/lib/domain/policy-publish';
import type { RuleEdit } from '@/lib/domain/policy-edit';
import { getRuleSuggestions } from '@/lib/domain/rule-suggestion-service';
import { acceptSuggestion } from '@/lib/domain/rule-suggestion-decide';

// --- Fixtures --------------------------------------------------------------------------------------

const ORG = 'org1';

// Shaped like a seeded policy: the data-protection and oversight rules are locked baselines; the
// purpose and disclosure rules are leader-editable.
const DATA_PROTECTION = 'Minimize personal information shared with AI.';
const OVERSIGHT = 'A person has the final say on anything AI drafts.';
const PURPOSE = 'We use AI to draft donor thank-you notes.';
const DISCLOSE = 'We tell people when AI helped write something.';

const SEED_RULES: NewPolicyRule[] = [
  {
    ruleText: DATA_PROTECTION,
    category: 'data-protection',
    riskTier: 'sensitive',
    origin: 'standard',
    isBaselineSafety: true,
  },
  {
    ruleText: OVERSIGHT,
    category: 'human-oversight',
    riskTier: 'all',
    origin: 'standard',
    isBaselineSafety: true,
  },
  { ruleText: PURPOSE, category: 'documentation', riskTier: 'all', origin: 'standard' },
  { ruleText: DISCLOSE, category: 'transparency', riskTier: 'all', origin: 'standard' },
];

const RUN = {
  skillKey: 'draft_thank_you',
  userInput: 'Maria, monthly gift',
  userId: 'u1',
  orgId: ORG,
};
const CLEAN_DRAFT = 'Thank you, Maria, for your monthly gift — it keeps our programs running.';
const DRAFT_WITH_EMAIL = 'Thank you, Maria! Reach me at maria@example.org with any questions.';

// System prompts Claude received, split by call (the self-critique call is the "Challenger").
let draftPrompts: string[] = [];
let critiquePrompts: string[] = [];
let nextDraft = CLEAN_DRAFT;

async function seedActivePolicy(): Promise<string> {
  const id = (await createPolicy({ orgId: ORG, name: 'Starter policy' }))!;
  await insertPolicyRules(id, SEED_RULES);
  await activatePolicy({ orgId: ORG, policyId: id });
  return id;
}

/** Publish an edit through the real editor path, starting from the authoritative active rules. */
async function publishEdit(
  build: (byText: (t: string) => string) => { edits: RuleEdit[]; additions: string[] },
) {
  const active = (await getActivePolicy(ORG))!;
  const current = await getPolicyRules(active.id);
  const byText = (t: string) => current.find((r) => r.ruleText === t)!.id;
  return publishEditedPolicy({
    orgId: ORG,
    createdBy: 'leader1',
    policyName: 'Edited policy',
    current,
    input: build(byText),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.policies = [];
  store.rules = [];
  store.seq = 0;
  store.failActivate = false;
  draftPrompts = [];
  critiquePrompts = [];
  nextDraft = CLEAN_DRAFT;

  let runSeq = 0;
  vi.mocked(getSkillByKey).mockResolvedValue({ id: 'skill1', name: 'Draft a thank-you note' });
  vi.mocked(createTaskRun).mockImplementation(async () => `run-${++runSeq}`);
  vi.mocked(draftWithClaude).mockImplementation(async (system: string) => {
    if (system.includes('Challenger')) {
      critiquePrompts.push(system);
      return { ok: true, text: JSON.stringify({ verdict: 'pass', reason: 'test' }) };
    }
    draftPrompts.push(system);
    return { ok: true, text: nextDraft };
  });
});

// --- Tests -----------------------------------------------------------------------------------------

describe('Verify a rule change propagates (Epic 1 · Policy inheritance)', () => {
  it("an edited rule's new wording grounds the very next draft (no redeploy)", async () => {
    await seedActivePolicy();
    await runGovernedSkill(RUN);
    expect(draftPrompts.at(-1)).toContain(`- ${PURPOSE}`);

    const edited =
      'We use AI only to draft donor thank-you notes, never to contact donors directly.';
    const res = await publishEdit((id) => ({
      edits: [
        { id: id(PURPOSE), ruleText: edited },
        { id: id(DISCLOSE), ruleText: DISCLOSE },
      ],
      additions: [],
    }));
    expect(res.status).toBe('published');

    await runGovernedSkill(RUN);
    expect(draftPrompts.at(-1)).toContain(`- ${edited}`);
    expect(draftPrompts.at(-1)).not.toContain(`- ${PURPOSE}`);
  });

  it('a retired rule leaves, and an added rule joins, the next draft', async () => {
    await seedActivePolicy();
    const added = 'Never mention a donor’s gift amount in a thank-you note.';
    const res = await publishEdit((id) => ({
      edits: [{ id: id(PURPOSE), ruleText: PURPOSE }], // DISCLOSE omitted -> retired
      additions: [added],
    }));
    expect(res.status).toBe('published');

    await runGovernedSkill(RUN);
    const prompt = draftPrompts.at(-1)!;
    expect(prompt).not.toContain(DISCLOSE);
    expect(prompt).toContain(`- ${added}`);
    expect(prompt).toContain(`- ${PURPOSE}`);
  });

  it('the self-critique Challenger reviews the next draft against the edited rules too', async () => {
    await seedActivePolicy();
    const edited = 'We tell every recipient, in the note itself, that AI helped write it.';
    await publishEdit((id) => ({
      edits: [
        { id: id(PURPOSE), ruleText: PURPOSE },
        { id: id(DISCLOSE), ruleText: edited },
      ],
      additions: [],
    }));

    await runGovernedSkill(RUN);
    const critique = critiquePrompts.at(-1)!;
    expect(critique).toContain("The organization's AI policy requires:");
    expect(critique).toContain(`- ${edited}`);
    expect(critique).not.toContain(`- ${DISCLOSE}`);
  });

  it('the next run is stamped with the new version; the earlier run keeps its exact old rules', async () => {
    const original = await seedActivePolicy();
    await runGovernedSkill(RUN);

    const res = await publishEdit((id) => ({
      edits: [{ id: id(PURPOSE), ruleText: 'We use AI for donor notes only.' }],
      additions: [],
    }));
    expect(res.status).toBe('published');
    if (res.status !== 'published') return;
    await runGovernedSkill(RUN);

    const stamps = vi.mocked(createTaskRun).mock.calls.map((c) => c[0].policyId);
    expect(stamps).toEqual([original, res.policyId]);
    expect(res.policyId).not.toBe(original);

    // Provenance stays truthful (ADR-0024 §2): the old version is archived, not mutated.
    expect(store.policies.find((p) => p.id === original)?.status).toBe('archived');
    expect((await getPolicyRules(original)).map((r) => r.ruleText)).toEqual(
      SEED_RULES.map((r) => r.ruleText),
    );
  });

  it('baseline rules survive an edit, so the contact-detail guardrail still fires on the next run', async () => {
    await seedActivePolicy();
    nextDraft = DRAFT_WITH_EMAIL;
    const before = await runGovernedSkill(RUN);
    expect(before.status).toBe('needs_review');

    // The leader retires everything they are allowed to — baselines must still carry forward.
    const res = await publishEdit(() => ({ edits: [], additions: [] }));
    expect(res.status).toBe('published');

    const after = await runGovernedSkill(RUN);
    expect(after.status).toBe('needs_review');
    if (after.status === 'needs_review') expect(after.guardrail.result).toBe('flag');
    expect(draftPrompts.at(-1)).toContain(`- ${DATA_PROTECTION}`);
    expect(draftPrompts.at(-1)).toContain(`- ${OVERSIGHT}`);
    expect(draftPrompts.at(-1)).not.toContain(PURPOSE);
  });

  it('a publish that fails to activate changes nothing: the next run keeps the old rules and stamp', async () => {
    const original = await seedActivePolicy();
    store.failActivate = true;

    const edited = 'We use AI for something else entirely.';
    const res = await publishEdit((id) => ({
      edits: [{ id: id(PURPOSE), ruleText: edited }],
      additions: [],
    }));
    expect(res.status).toBe('failed');

    await runGovernedSkill(RUN);
    expect(draftPrompts.at(-1)).toContain(`- ${PURPOSE}`);
    expect(draftPrompts.at(-1)).not.toContain(edited);
    expect(vi.mocked(createTaskRun).mock.calls.at(-1)?.[0].policyId).toBe(original);
  });
});

describe('Build "accept suggested rule" flow — an accepted suggestion applies on the next run', () => {
  const SUGGESTED_TEXT =
    'We don’t use AI to give medical advice, and a person checks any health-related draft before it is used.';

  beforeEach(() => {
    vi.mocked(getRuleSuggestions).mockResolvedValue({
      status: 'ok',
      suggestions: [
        {
          key: 'risky:medical',
          ruleText: SUGGESTED_TEXT,
          standardRuleId: 'sr-override',
          citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
          category: 'human-oversight',
          riskTier: 'high',
          count: 4,
          windowDays: 30,
          evidenceLabel: 'Health-related tasks — 4 times in the last 30 days',
        },
      ],
    });
  });

  it('accepting adds the rule to the active policy and grounds the very next governed run', async () => {
    const original = await seedActivePolicy();
    await runGovernedSkill(RUN);
    expect(draftPrompts.at(-1)).not.toContain(SUGGESTED_TEXT);

    const res = await acceptSuggestion({
      orgId: ORG,
      userId: 'leader1',
      suggestionKey: 'risky:medical',
      ruleText: SUGGESTED_TEXT,
    });
    expect(res.status).toBe('accepted');
    if (res.status !== 'accepted') return;

    await runGovernedSkill(RUN);
    expect(draftPrompts.at(-1)).toContain(`- ${SUGGESTED_TEXT}`);
    expect(vi.mocked(createTaskRun).mock.calls.map((c) => c[0].policyId)).toEqual([
      original,
      res.policyId,
    ]);

    // The new version keeps every prior rule and records the suggestion's provenance.
    const newRules = await getPolicyRules(res.policyId);
    expect(newRules.map((r) => r.ruleText)).toEqual(
      expect.arrayContaining(SEED_RULES.map((r) => r.ruleText)),
    );
    expect(newRules.find((r) => r.ruleText === SUGGESTED_TEXT)).toMatchObject({
      origin: 'suggested',
      suggestionKey: 'risky:medical',
      citation: 'EU AI Act (Reg. (EU) 2024/1689), Article 14 (human oversight)',
    });
  });
});
