import { Suspense } from 'react';
import PersonForm from '@/components/PersonForm';

export default function PersonPage() {
  // useSearchParams (?id=…) v PersonForm zahteva Suspense mejo.
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-ink-2">Loading…</div>}>
      <PersonForm />
    </Suspense>
  );
}
