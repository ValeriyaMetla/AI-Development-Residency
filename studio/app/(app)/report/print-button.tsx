'use client';

import Button from '@mui/material/Button';

/**
 * "Print / Save as PDF" (card "Build one-click responsible-AI summary export", US2). A client
 * component only because `window.print()` runs in the browser — it holds no logic and reads no data.
 * The browser's own print dialog does the export (no PDF library, no export service); the print
 * layout itself is CSS (`displayPrint`), and this button hides itself from the printout.
 */
export function PrintButton() {
  return (
    <Button variant="contained" onClick={() => window.print()} sx={{ displayPrint: 'none' }}>
      Print / Save as PDF
    </Button>
  );
}
