// Identical in lockfile-npm, lockfile-yarn and lockfile-pnpm on purpose.
// The three repos differ only in which lock format records the same
// resolved tree, so `scan --format json` must emit byte-identical stdout
// for all three — any drift is a lock-parser parity bug, not a fixture
// difference.
import { Button, Card } from '@design-system/foundation';
import { LegacyBanner } from '@old-system/ui';
import { useState } from 'react';

export default function Usage() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <LegacyBanner />
      <Button onClick={() => setOpen(!open)}>toggle</Button>
    </Card>
  );
}
