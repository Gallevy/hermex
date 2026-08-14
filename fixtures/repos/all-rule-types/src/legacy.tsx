import { useMemo } from 'react';

export default function Legacy() {
  return <span>{useMemo(() => 'legacy', [])}</span>;
}
