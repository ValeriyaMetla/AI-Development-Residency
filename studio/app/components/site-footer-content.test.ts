import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOOTER, HELLO_EMAIL } from './site-footer-content';

/**
 * Card "Add a footer to the landing page and demo": the footer may link only to pages that exist.
 * Each internal link is checked against the app's files, and the FAQ anchor against the FAQ
 * section's heading id, so a removed page or renamed anchor fails the build instead of leaving a
 * dead link on every public page.
 */

/** The route file that serves a path, e.g. "/your-data" → app/your-data/page.tsx. */
function pageFileFor(path: string): string {
  return path === '/' ? 'app/page.tsx' : `app${path}/page.tsx`;
}

const links = FOOTER.groups.flatMap((g) => g.links);

describe('site footer', () => {
  it('links only to pages that exist', () => {
    for (const { href } of links) {
      const [path, anchor] = href.split('#');
      expect(existsSync(pageFileFor(path)), `missing page for ${href}`).toBe(true);
      if (anchor) {
        // The FAQ heading id lives in the FAQ section component.
        const faq = readFileSync('app/components/landing/faq.tsx', 'utf8');
        expect(faq, `missing anchor #${anchor}`).toContain(`id="${anchor}"`);
      }
    }
  });

  it('includes the demo, sign-up, log-in, data page and FAQ links the card asks for', () => {
    const hrefs = links.map((l) => l.href);
    for (const href of ['/demo', '/signup', '/login', '/your-data', '/#faq-heading'])
      expect(hrefs).toContain(href);
  });

  it('says it is not legal advice and gives the labelled hello inbox', () => {
    expect(FOOTER.notLegalAdvice).toBe('Not legal advice.');
    expect(HELLO_EMAIL).toBe('communityaistudio+hello@gmail.com');
  });

  it('is used on all three public pages, outside <main>', () => {
    for (const file of ['app/page.tsx', 'app/demo/layout.tsx', 'app/your-data/page.tsx']) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).toContain('<SiteFooter />');
      // The footer comes after </main>'s closing tag, i.e. it's its own landmark.
      expect(src.lastIndexOf('<SiteFooter />')).toBeGreaterThan(
        src.lastIndexOf('component="main"'),
      );
    }
  });
});
