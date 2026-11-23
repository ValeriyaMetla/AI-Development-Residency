import Box from '@mui/material/Box';
import { Hero } from './components/landing/hero';
import { HowItWorks } from './components/landing/how-it-works';
import { SafetyNet } from './components/landing/safety-net';
import { WhoItsFor } from './components/landing/who-its-for';
import { Standards } from './components/landing/standards';
import { FreeSafetyNet } from './components/landing/free-safety-net';
import { FinalCta } from './components/landing/final-cta';

/**
 * Public landing page — hero → how it works → the safety net → who it's for → standards → free
 * safety net → final CTA. Presentation only — no data access, so the Leak Test trivially holds.
 * The hero's "Try the demo" button links to the full demo at /demo (ADR-0029). Every claim maps
 * to a mechanism Release 1b actually ships.
 */
export default function Home() {
  return (
    <Box component="main">
      <Hero />
      <HowItWorks />
      <SafetyNet />
      <WhoItsFor />
      <Standards />
      <FreeSafetyNet />
      <FinalCta />
    </Box>
  );
}
