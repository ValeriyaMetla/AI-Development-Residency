---
name: skill-authoring
description: Enforces the canonical structure and build method for authoring a Claude Skill — correct frontmatter (name, description, metadata version), the six-part body (intent, numbered rules grounded in an authoritative source, checklist, when-unsure, based-on, optional examples), and the authoring principles (concise first, match degrees of freedom, explain the why, progressive disclosure, split past ~500 lines). Use when creating, writing, drafting, structuring, or restructuring a skill or SKILL.md, deciding what belongs in a skill vs a reference file, or fixing a skill that is bloated or poorly structured — even if the user doesn't say "skill-authoring". Do NOT use for evaluating whether a skill works, triggers, or earns its context (use skill-evaluation), or for repo git/branch/install mechanics.
metadata:
  version: 1.1
---

# Skill Authoring

## Intent

Make every new Claude Skill consistent, concise, and grounded in an authoritative source —
structure designed in from the first line, not patched on later. This skill owns HOW a skill is
shaped and built; whether a finished skill actually works, triggers, and earns its context cost
is [[skill-evaluation]]'s job. Grounded in Anthropic's Skill authoring best practices and the
canonical template in SKILLS-LIBRARY.md.

## Rules

1. **Frontmatter, fenced by `---`.** `name` (kebab-case, matches the folder), `description`
   (see rule 2), and `metadata.version` (semantic — bump minor for additive, major for a
   breaking rewrite). FORBIDDEN in frontmatter: angle brackets `< >`, and any name starting with
   `claude` or `anthropic` — both silently break upload.
2. **Write the description to trigger.** What it does FIRST, then "Use when…" + concrete triggers;
   third person; ≤1024 characters. Claude UNDER-triggers skills, so be a little pushy — name real
   contexts and phrases ("…even if the user doesn't say 'skill'"). Add a "Do NOT use (use X)"
   boundary when a neighbor skill owns the adjacent decision.
3. **Body in six parts, in order:** Intent (1–3 sentences, right after the H1, stating what it
   enforces and its source) → numbered rules (each grounded in an authoritative source) →
   checklist ("before calling it done") → "when unsure" guardrail → "based on" (the sources).
   Optional seventh: one good/bad example pair, only where the rules need judgment.
4. **Concise is the #1 rule.** The context window is shared — add only what Claude doesn't already
   know. Challenge every line: does it justify its token cost? Cut what Claude can already do.
5. **Match degrees of freedom to the task.** High freedom (principles, prose) when many approaches
   are valid and judgment matters; low freedom (exact steps, scripts, "don't modify this command")
   when a task is fragile and must be done one consistent way.
6. **Explain the *why*.** Give the reasoning behind each rule so the model can generalize, not just
   comply — "do X because Y" beats a bare command. A wall of ALL-CAPS NEVER/ALWAYS is a yellow
   flag: reframe it to surface the reason instead. Reserve hard mandates for the few things that
   are genuinely fragile (rule 5).
7. **Progressive disclosure.** Keep SKILL.md under ~500 lines. Past that, move detail into a
   `references/` folder, link one level deep, and add a table of contents to any reference over
   ~100 lines. Bundle `scripts/` for deterministic work and `assets/` for output templates. No
   `README.md` inside a skill folder — docs live in SKILL.md or references/.
8. **Ground every rule in an authoritative source.** Prefer primary/standard sources (OWASP,
   Nielsen, WCAG, NIST, Anthropic docs, Lean Startup) over vendor blogs; name them in "based on".
   An ungrounded rule is cut or sourced, never shipped on opinion.
9. **No surprises — the skill is honest about what it does.** A skill must never contain malicious
   or deceptive content (malware, exploit code), and its behavior must match its stated intent:
   described plainly, nothing it does should surprise the user. (A roleplay or persona skill is
   fine when that *is* the stated intent.)
10. **Build method.** Research the source first → write on the template → prove it helps with a
    quick baseline check (run 2–3 target prompts with and without the skill; confirm with-skill is
    better — fix a real gap, not an imagined one) → draft the full SKILL.md in chat for review
    before it lands in the repo. Rigorous triggering/eval is [[skill-evaluation]]. Authoring is
    done at an approved draft; *installing* it is a further gate owned elsewhere — the SKILL.md, its
    `docs/SKILLS-LIBRARY.md` catalog entry, and a triggering re-test land in the **same commit**
    (the install Definition of Done; its git mechanics live in the operating model, the re-test in
    [[skill-evaluation]]).

## Checklist before calling a skill "done"

- [ ] Frontmatter: name matches folder (kebab-case); description leads with what-it-does + "Use
      when" + triggers, ≤1024 chars; metadata.version set; no angle brackets; no claude/anthropic prefix
- [ ] Body: Intent → grounded numbered rules → checklist → when-unsure → based-on, in that order
- [ ] Concise: every line earns its token cost; under ~500 lines (else split into references/)
- [ ] Rules explain their *why*; no wall of ALL-CAPS NEVER/ALWAYS
- [ ] No README.md inside the skill folder
- [ ] Sources are authoritative and named in "based on"
- [ ] No malicious or deceptive content; the skill's behavior matches its stated intent
- [ ] Quick baseline check done (with vs without); rigorous evaluation handed to skill-evaluation

## When unsure

- If a rule isn't grounded in an authoritative source, find the source or cut the rule.
- If you're stacking up ALL-CAPS MUSTs, stop and explain the *why* instead — reserve hard mandates
  for genuinely fragile steps.
- If the skill is growing past ~500 lines, split into references/ rather than cram.
- If you're testing whether the skill actually works or triggers, that's skill-evaluation — switch.
- If tempted to add something Claude already knows, cut it — concision wins.

## Based on

- **Anthropic — Skill authoring best practices**
  (platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- **The canonical template + build method in SKILLS-LIBRARY.md** (repo is source of truth; the
  Project copy is a mirror)
- Composes with [[skill-evaluation]] (does the skill work / trigger / earn its cost)

## Examples

**❌ Bad** — `name: SkillAuthoring` (not kebab-case, doesn't match the folder); the description
reads "Helps you make skills." (no triggers, no "Do NOT use" boundary); the rules are the author's
unsourced opinions, written as a wall of ALL-CAPS NEVER/ALWAYS with no reasoning; the skill quietly
does more than its description admits; 700 lines in one file with a `README.md` sitting beside it.

**✅ Good** — `name: skill-authoring` matches the folder; the description leads with what-it-does,
names concrete trigger phrases, and adds a "Do NOT use (use skill-evaluation)" boundary; each rule
cites the best-practices doc or the canonical template and explains *why* it matters; the skill
does exactly what its description says; an 82-line body with the long detail split into
`references/` and linked one level deep.
