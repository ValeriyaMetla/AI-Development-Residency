---
name: accessibility
description: Enforces accessible interfaces that work for people with disabilities, following WCAG 2.2 Level AA and the POUR principles — text alternatives, keyboard operability, color contrast, semantic HTML, and screen-reader support. Use when building or reviewing any UI, HTML, component, form, image, color choice, or interaction that a person will see or operate.
metadata:
  version: 1.0
---

# Accessibility

## Intent

Build interfaces usable by everyone, including people who use screen readers, keyboards only, or need high contrast. Accessibility is a requirement, not an enhancement. This skill follows WCAG 2.2 Level AA, organized by the four POUR principles.

## Perceivable — users can sense the content

1. **Provide text alternatives.** Give meaningful images descriptive `alt` text; mark decorative images with empty `alt=""`. Label icon-only buttons with an accessible name (`aria-label`).
2. **Caption and transcribe media.** Provide captions for video and transcripts for audio.
3. **Meet color contrast minimums.** At least 4.5:1 for normal text, 3:1 for large text. Never use color as the *only* way to convey meaning — back it up with text, icons, or labels.

## Operable — everything works without a mouse

4. **Full keyboard access.** Every interactive element must be reachable and usable by keyboard alone. No keyboard traps.
5. **Visible focus.** Keep a clear focus indicator, and make focus order match the logical reading order. Manage focus when dialogs open and close.
6. **No seizure triggers.** Nothing flashes more than three times per second.

## Understandable — users comprehend the interface

7. **Label every form field.** Associate a visible label with each input, and link error and hint messages programmatically (`aria-describedby`, `aria-invalid`).
8. **Be predictable and clear.** Consistent navigation and labels across pages, clear instructions, and error messages that explain how to fix the problem.
9. **Declare page language and a descriptive title.**

## Robust — works with assistive technology

10. **Prefer semantic HTML.** Use native elements for their purpose — `<button>` for actions, `<a>` for navigation, properly nested headings, landmark regions. Reach for ARIA only when HTML falls short, and keep ARIA states current (`aria-expanded`, etc.).

## Checklist before calling accessibility "done"

- [ ] All meaningful images have alt text; decorative ones have `alt=""`
- [ ] Icon-only controls have accessible names
- [ ] Text contrast meets 4.5:1 (3:1 for large text)
- [ ] Meaning is never conveyed by color alone
- [ ] Every feature works with the keyboard, with visible focus
- [ ] Every form field has a label; errors are linked programmatically
- [ ] Semantic HTML is used; ARIA only where needed
- [ ] Tested with a keyboard and a screen reader, not just automated tools

## When unsure

Automated scanners catch only part of the issues. If an interaction is complex (custom widgets, dynamic content, focus management), flag it for manual keyboard and screen-reader testing rather than assuming it passes. Make accessibility part of the definition of done.

## Based on

- WCAG 2.2 Level AA — W3C Web Content Accessibility Guidelines (w3.org/WAI)
- POUR principles: Perceivable, Operable, Understandable, Robust
