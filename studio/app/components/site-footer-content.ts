/**
 * Footer copy and links (card "Add a footer to the landing page and demo", Epic #8). Pure data, so
 * `site-footer-content.test.ts` can check every link points at a page that exists.
 *
 * Contact: the product inbox, "+hello" version, which Gmail files under the Hello label
 * (decision 2026-11-23, card "Decide how organizations contact us about their data").
 */

export type FooterLink = { label: string; href: string };

export const HELLO_EMAIL = 'communityaistudio+hello@gmail.com';

export const FOOTER = {
  tagline: 'Use AI safely and fairly.',
  groups: [
    {
      heading: 'Product',
      links: [
        { label: 'Try the demo', href: '/demo' },
        { label: 'Sign up free', href: '/signup' },
        { label: 'Log in', href: '/login' },
      ],
    },
    {
      heading: 'Trust',
      links: [
        { label: 'How we handle your data', href: '/your-data' },
        { label: 'Questions nonprofits ask us', href: '/#faq-heading' },
      ],
    },
  ] satisfies { heading: string; links: FooterLink[] }[],
  contactLead: 'Questions?',
  notLegalAdvice: 'Not legal advice.',
} as const;
