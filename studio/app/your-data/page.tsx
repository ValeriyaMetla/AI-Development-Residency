import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { AUTH_BRAND } from '../components/auth/auth-content';
import { SiteFooter } from '../components/site-footer';
import { PRIVACY_EMAIL, YOUR_DATA, type Item } from './your-data-content';

/**
 * Public "How we handle your data" page (Epic #8). Presentation only: static, no data access, no
 * sign-in needed. Every word lives in `your-data-content.ts`, which is traced to the audited fact
 * sheet and guarded by a test.
 *
 * Accessibility + UX notes:
 * - One <h1>, then an <h2> per question a leader asks, in the order they'd ask them.
 * - Plain lists; bold lead-ins carry meaning in words, not in color.
 * - Source links open the provider's own page in a new tab and say so to screen readers.
 * - The early-version note is a standing note (role="note"), not an interrupting alert.
 */

export const metadata: Metadata = {
  title: 'How we handle your data — Community AI Workflow Studio',
  description:
    "A plain-language summary of what happens to your organization's information in the Studio.",
};

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" aria-labelledby={id} sx={{ mt: 5 }}>
      <Typography id={id} variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {heading}
      </Typography>
      {children}
    </Box>
  );
}

function ItemList({ items }: { items: readonly Item[] }) {
  return (
    <Box component="ul" sx={{ pl: 3, m: 0, display: 'grid', gap: 1 }}>
      {items.map((item) => (
        <Typography component="li" variant="body1" key={item.text}>
          {item.lead ? <strong>{item.lead} </strong> : null}
          {item.text}
        </Typography>
      ))}
    </Box>
  );
}

export default function YourDataPage() {
  const d = YOUR_DATA;
  return (
    <>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', py: 2 }}>
        <Container maxWidth="md">
          <Link
            component={NextLink}
            href="/"
            underline="none"
            sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1rem' }}
          >
            {AUTH_BRAND.name}
          </Link>
        </Container>
      </Box>

      <Container component="main" maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
          {d.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {d.label}
        </Typography>
        <Typography variant="body1" sx={{ mt: 3 }}>
          {d.intro}
        </Typography>

        <Alert severity="info" role="note" sx={{ mt: 3 }}>
          <strong>{d.earlyVersion.lead}</strong> {d.earlyVersion.text}
        </Alert>

        <Section id="your-data-ai" heading={d.ai.heading}>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            {d.ai.intro}
          </Typography>
          <ItemList items={d.ai.items} />
        </Section>

        <Section id="your-data-access" heading={d.access.heading}>
          <ItemList items={d.access.items} />
        </Section>

        <Section id="your-data-kept" heading={d.kept.heading}>
          <ItemList items={d.kept.items} />
        </Section>

        <Section id="your-data-record" heading={d.record.heading}>
          <Typography variant="body1">{d.record.text}</Typography>
        </Section>

        <Section id="your-data-providers" heading={d.providers.heading}>
          <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 500 }}>
            {d.providers.intro}
          </Typography>
          <Box component="ul" sx={{ pl: 3, m: 0, display: 'grid', gap: 1.5 }}>
            {d.providers.items.map((p) => (
              <Typography component="li" variant="body1" key={p.name}>
                <strong>{p.name}</strong> {p.text}{' '}
                {p.links.map((l, i) => (
                  <Box component="span" key={l.href}>
                    {i > 0 ? ' · ' : null}
                    <Link href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <Box component="span" sx={{ position: 'absolute', left: '-10000px' }}>
                        {' '}
                        (opens in a new tab)
                      </Box>
                    </Link>
                  </Box>
                ))}
              </Typography>
            ))}
          </Box>
        </Section>

        <Section id="your-data-not-yet" heading={d.notYet.heading}>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            {d.notYet.intro}
          </Typography>
          <ItemList items={d.notYet.items} />
        </Section>

        <Section id="your-data-contact" heading={d.contact.heading}>
          <Typography variant="body1">
            {d.contact.emailLead}{' '}
            <Link href={`mailto:${PRIVACY_EMAIL}`} sx={{ fontWeight: 700 }}>
              {PRIVACY_EMAIL}
            </Link>
            .
          </Typography>
          <Typography variant="body1" sx={{ mt: 1.5 }}>
            {d.contact.deletion}
          </Typography>
        </Section>
      </Container>
      <SiteFooter />
    </>
  );
}
