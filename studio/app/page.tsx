import Box from '@mui/material/Box';
import { Hero } from './components/landing/hero';
import { HowItWorks } from './components/landing/how-it-works';
import { SafetyNet } from './components/landing/safety-net';
import { WhoItsFor } from './components/landing/who-its-for';
import { Standards } from './components/landing/standards';
import { FreeSafetyNet } from './components/landing/free-safety-net';
import { FinalCta } from './components/landing/final-cta';
import { TryDemo } from './components/landing/try-demo';

/**
 * Public landing page: hero → try it (the demo's governed run, ADR-0029) → how it works → the
 * safety net → who it's for → standards → free safety net → final CTA. No data access, so the
 * Leak Test trivially holds; the "Try it" runs come from fixed sample data and the real safety
 * code. Every claim maps to a mechanism Release 1b actually ships.
 */
export default function Home() {
  return (
    <Box component="main">
      <Hero />
      <TryDemo />
      <HowItWorks />
      <SafetyNet />
      <WhoItsFor />
      <Standards />
      <FreeSafetyNet />
      <FinalCta />
    </Box>
  );
}
