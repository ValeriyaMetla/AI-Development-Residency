---
name: ux-usability
description: Designs clear, efficient, role-aware user experiences grounded in Nielsen's usability heuristics and enterprise UX principles. Use when designing or building any user-facing interface, screen, form, flow, navigation, button, dashboard, or interaction — websites, apps, enterprise tools, or CLI output.
---

# UX / Usability

## Intent

Good UX means users accomplish their goal with minimum confusion and effort. Design for the person using it, not for the person building it. This skill is grounded in Jakob Nielsen's 10 Usability Heuristics (Nielsen Norman Group) and enterprise UX best practices.

## Core rules (usability foundations)

1. **Make the next step obvious.** The primary action on any screen should be the most visually prominent. Don't make users hunt.
2. **Give feedback (visibility of system status).** Every action gets a visible response — loading states, success confirmations, and clear error messages that say what to do next.
3. **Match the real world.** Use words and concepts your users already know. "Save changes," not "Submit." Avoid internal jargon.
4. **Prevent errors before they happen.** Use sensible defaults, constrain inputs (date pickers, dropdowns), and confirm destructive actions.
5. **Recognition over recall.** Keep key options visible so users don't have to remember hidden steps.
6. **User control and freedom.** Let users undo actions and exit flows easily — provide a clear way out.
7. **Be consistent.** Same words, colors, and patterns for the same things throughout, ideally via a shared design system.
8. **Reduce effort.** Pre-fill what you can, keep forms short, ask only for what's needed, and remember user choices.

## Enterprise-specific rules

9. **Design for whole workflows, not single screens.** Enterprise tasks span many steps, roles, and systems. Map the end-to-end journey before designing any one screen.
10. **Tailor views to roles.** Show each user only what their job and permissions require — role-based views reduce clutter and mistakes.
11. **Favor efficiency over visual flair.** Enterprise users are often power users doing repetitive work; optimize for speed and accuracy, not decoration.
12. **Follow familiar patterns (Jakob's Law).** Users spend most of their time in other software and expect yours to behave similarly. Reuse established patterns to cut the learning curve.

## Checklist before calling UX "done"

- [ ] The main action on each screen is clear and prominent
- [ ] Every action gives visible feedback (loading / success / error)
- [ ] Error messages explain how to fix the problem
- [ ] Destructive actions require confirmation and can be undone
- [ ] Labels and buttons use plain, consistent language
- [ ] Forms ask only for what is necessary
- [ ] The design supports the full workflow, not just one screen
- [ ] Each role sees only what it needs
- [ ] Familiar, consistent patterns are used throughout

## When unsure

If a design trade-off affects how easily real users succeed (layout, wording, flow length, role permissions), flag it and suggest the simpler, lower-effort option. When possible, recommend testing with a real user over guessing.

## Based on

- Jakob Nielsen's 10 Usability Heuristics — Nielsen Norman Group (nngroup.com)
- Jakob's Law of the Internet User Experience
- Enterprise UX best practices: workflow-first design, role-based views, efficiency for power users
