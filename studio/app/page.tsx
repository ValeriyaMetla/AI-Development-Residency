import Box from '@mui/material/Box';
import { Hero } from './components/landing/hero';
import { HowItWorks } from './components/landing/how-it-works';

/**
 * Public landing page. Built section by section (see the 7-section outline: hero → how it
 * works → the safety net → who it's for → standards → free safety net → final CTA).
 * Presentation only — no data access, so the Leak Test trivially holds.
 */
export default function Home() {
  return (
    <Box component="main">
      <Hero />
      <HowItWorks />
    </Box>
  );
}
