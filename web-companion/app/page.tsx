'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import LoginForm from '@/components/LoginForm';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { takeFlash } from '@/lib/flash';
import { errorMessage, listRecentPeople, personName, personPhoto, personPlace, type PersonRow } from '@/lib/people';

export default function HomePage() {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-2">Loading…</div>;
  }
  if (!session) return <LoginForm />;
  return <Home session={session} />;
}

function Home({ session }: { session: Session }) {
  const [people, setPeople] = useState<PersonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPeople(await listRecentPeople(session.user.id, 20));
    } catch (e) {
      console.error(e);
      setError(`Could not load people: ${errorMessage(e)}`);
    }
  }, [session.user.id]);

  useEffect(() => {
    load();
    // Po vrnitvi z obrazca pokaži potrditev (npr. "Person added ✓").
    const message = takeFlash();
    if (message) {
      setFlash(message);
      setTimeout(() => setFlash(null), 3000);
    }
  }, [load]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <PageHeader
        title="MetMap – Quick Add"
        right={
          <button
            className="min-h-12 px-1 text-sm font-semibold text-ink-2"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out"
          >
            Sign out
          </button>
        }
      />

      <main className="px-4 pb-8 pt-4">
        {flash ? (
          <div role="status" className="mb-3 rounded-xl bg-teal px-4 py-3 text-center font-semibold text-white">
            {flash}
          </div>
        ) : null}

        <Link href="/person" className="btn btn-primary w-full text-lg">
          + Add person
        </Link>

        <h2 className="section-title">Recently added</h2>

        {error ? (
          <div>
            <p className="error-text">{error}</p>
            <button className="btn btn-secondary mt-3" onClick={load}>
              Try again
            </button>
          </div>
        ) : people === null ? (
          <p className="py-6 text-center text-ink-2">Loading…</p>
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-ink-2">No people yet – add your first one!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {people.map((p) => {
              const photo = personPhoto(p);
              const place = personPlace(p);
              return (
                <li key={p.id}>
                  <Link
                    href={`/person?id=${p.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-sand bg-surface p-2.5 active:bg-surface-muted"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xl">
                        👤
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{personName(p)}</p>
                      {place ? <p className="truncate text-sm text-ink-2">{place}</p> : null}
                    </div>
                    <span className="px-1 text-ink-3" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
