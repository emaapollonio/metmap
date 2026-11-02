import type { ReactNode } from 'react';

/** Naslovna vrstica z odmikom za iPhone zarezo (safe-area-inset-top). */
export default function PageHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b border-sand bg-cream px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex min-w-12 justify-start">{left}</div>
      <h1 className="flex-1 truncate text-center font-serif text-lg">{title}</h1>
      <div className="flex min-w-12 justify-end">{right}</div>
    </header>
  );
}
