// Same component name (`Button`) as 02-collision-pulse-button.tsx, imported
// from a different package. Aggregating both files must keep the two
// `Button` usages attributed to their own source instead of collapsing
// into whichever file is processed first.
import Button from '@acme-ui/classic/Button';

export default function ClassicExample() {
  return <Button>classic</Button>;
}
