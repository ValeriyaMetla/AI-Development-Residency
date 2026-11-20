import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { getMyOrgId } from '@/lib/data/runs';
import { getMyProfile } from '@/lib/data/profile';
import { getActivePolicy, getPolicyRulesOrNull } from '@/lib/data/policy';
import { buildPolicyDocument } from '@/lib/domain/policy-document';
import { PrintButton } from '../../report/print-button';

/**
 * Readable policy document (Presentation layer, ADR-0003; card "Download the policy as a readable
 * document"). Leader-only, checked here on the server. Renders the org's ACTIVE policy as a formal
 * document built by the pure `buildPolicyDocument` (template-only, no model call); the browser's
 * Print / Save as PDF does the export (no PDF library). The shell already hides its chrome in print;
 * this page hides its own controls too, so the PDF contains only the document.
 */
export default async function PolicyDocumentPage() {
  const profile = await getMyProfile();
  if (profile?.role !== 'accountable_leader') {
    return (
      <Notice heading="Policy document">
        Only an Accountable Leader can open the policy document.
      </Notice>
    );
  }

  const orgId = await getMyOrgId();
  const policy = orgId ? await getActivePolicy(orgId) : null;
  if (!policy) {
    return (
      <Notice heading="Policy document" showBack>
        Your organization doesn&apos;t have an active policy yet. Set your AI rules first.
      </Notice>
    );
  }

  const rules = await getPolicyRulesOrNull(policy.id);
  if (rules === null) {
    // A load failure must never print as a (wrong, shorter) policy.
    return (
      <Notice heading="Policy document" severity="warning" showBack>
        We couldn&apos;t load your rules, so the document can&apos;t be shown right now. Please try
        again.
      </Notice>
    );
  }

  const doc = buildPolicyDocument({
    orgName: profile.org?.name ?? '',
    versionCreatedAt: policy.createdAt,
    rules,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', displayPrint: 'none' }}>
        <PrintButton />
        <Button component={NextLink} href="/policy-seed">
          Back to your rules
        </Button>
      </Box>

      <Box
        component="article"
        aria-labelledby="policy-title"
        sx={{
          maxWidth: 760,
          '@media print': { maxWidth: 'none', color: '#000', '& *': { color: '#000 !important' } },
        }}
      >
        <Typography id="policy-title" variant="h4" component="h1" gutterBottom>
          {doc.title}
        </Typography>
        <Typography variant="body1">
          Status: <strong>{doc.status}</strong> · {doc.versionLabel} · {doc.accountableNote}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 3 }}>
          {doc.generatedNote}
        </Typography>

        {doc.sections.map((section) => (
          <Box
            component="section"
            key={section.number}
            aria-labelledby={`section-${section.number}`}
            sx={{ mb: 3, breakInside: 'avoid-page' }}
          >
            <Typography id={`section-${section.number}`} variant="h6" component="h2" gutterBottom>
              {section.number}. {section.heading}
            </Typography>
            {section.intro ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic', mb: 1 }}
              >
                {section.intro}
              </Typography>
            ) : null}
            {section.clauses.length ? (
              // Clause numbers ("3.1") are printed as text, so list markers are turned off;
              // role="list" keeps list semantics for screen readers when the markers are hidden.
              <Box component="ol" role="list" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {section.clauses.map((clause) => (
                  <Box component="li" key={clause.number} sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                    <Typography component="span" sx={{ minWidth: 32, fontWeight: 600 }}>
                      {clause.number}
                    </Typography>
                    <Typography component="span">
                      {clause.text}
                      {clause.required ? <strong> (Required)</strong> : null}
                      {clause.refs.map((n) => (
                        <Box
                          component="a"
                          key={n}
                          href={`#ref-${n}`}
                          aria-label={`Reference ${n}`}
                          sx={{ ml: 0.5, color: 'inherit' }}
                        >
                          [{n}]
                        </Box>
                      ))}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
            {section.paragraphs.map((p) => (
              <Typography key={p} variant="body1" sx={{ mb: 1 }}>
                {p}
              </Typography>
            ))}
          </Box>
        ))}

        {doc.references.length ? (
          <Box component="section" aria-labelledby="references-heading">
            <Typography id="references-heading" variant="h6" component="h2" gutterBottom>
              References
            </Typography>
            <Box component="ol" role="list" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {doc.references.map((ref) => (
                <Box component="li" key={ref.number} id={`ref-${ref.number}`} sx={{ mb: 0.5 }}>
                  <Typography variant="body2">
                    [{ref.number}] {ref.citation}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function Notice({
  heading,
  children,
  severity = 'info',
  showBack = false,
}: {
  heading: string;
  children: React.ReactNode;
  severity?: 'info' | 'warning';
  showBack?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4" component="h1">
        {heading}
      </Typography>
      <Alert severity={severity}>{children}</Alert>
      {showBack ? (
        <Box>
          <Button component={NextLink} href="/policy-seed">
            Back to your rules
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
