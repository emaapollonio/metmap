# MetMap – Quick Add (spletna companion)

Lahka PWA za hitro dodajanje oseb na poti (iPhone Safari → "Add to Home Screen"). Deli samo Supabase
projekt z mobilno app; kode mobilne app, migracij, RLS in Edge Functions se ne dotika.

- Next.js (App Router) + TypeScript + Tailwind CSS, `@supabase/supabase-js`
- Prijava z e-pošto/geslom (isti računi kot v app), seznam zadnjih 20 oseb, dodajanje / urejanje / brisanje
- Polja: ime, kraj in datum srečanja, podrobnosti, mesto/država, rojstni dan, opomba, fotografija
- Kraji prek Nominatim (obvezna izbira predloga, kot v mobilni app)

## Lokalno

```bash
cd web-companion
cp .env.example .env.local   # vnesi NEXT_PUBLIC_SUPABASE_URL in NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:3000
```

Vrednosti sta isti kot `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` v mobilni app.

## Deploy (Vercel)

1. Vercel → *Add New Project* → izberi GitHub repo.
2. **Root Directory: `web-companion`** (framework: Next.js se zazna sam).
3. *Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL` in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Vsak naslednji push na `master` deploya samodejno.

## Na iPhone

Safari → odpri URL → ikona *Share* → **Add to Home Screen** → *Add*.
Odpre se v celozaslonskem načinu brez Safari vrstice; prijava se obdrži (localStorage).
