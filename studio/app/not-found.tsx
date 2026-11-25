import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import { AUTH_BRAND } from '@/app/components/auth/auth-content';

/**
 * Branded 404 (Presentation layer). Next.js renders this for an unmatched route or a `notFound()`
 * call, replacing the bare "This page could not be found". Rendered inside the root layout, so it
 * gets the MUI theme — but it sits outside the signed-in app shell, so it carries no navigation of
 * its own and always offers a clear way home. No data access (the Leak Test holds).
 */
export default function NotFound() {
  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="p"
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.2 }}
        >
          {AUTH_BRAND.name}
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{ mt: 1, mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}
        >
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </Typography>
        <Button component={NextLink} href="/" variant="contained" size="large">
          Back to home
        </Button>
      </Box>
    </Container>
  );
}
