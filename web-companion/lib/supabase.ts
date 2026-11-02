import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Manjkata NEXT_PUBLIC_SUPABASE_URL in/ali NEXT_PUBLIC_SUPABASE_ANON_KEY (glej .env.example).',
  );
}

/** Isti Supabase projekt kot mobilna app; seja se hrani v localStorage (privzeto obnašanje klienta). */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const PERSON_PHOTOS_BUCKET = 'person-photos';
