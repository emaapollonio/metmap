/**
 * Iskanje krajev prek Nominatim (OpenStreetMap), enako kot v mobilni app (src/lib/geocoding.ts).
 * Usage policy: največ 1 zahtevek/sekundo – vsi klici tečejo skozi eno vrsto z minimalnim razmikom.
 */
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_REQUEST_GAP_MS = 1100;

export type Coords = { latitude: number; longitude: number };

export type PlaceSuggestion = Coords & {
  id: string;
  /** Ime kraja brez regije in države. */
  name: string;
  country: string | null;
  /** Za prikaz in shranjevanje: "Izola, Slovenia" oz. "Portorož, Piran, Slovenia". */
  label: string;
};

export type PlaceMode = 'settlement' | 'country' | 'any';

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
};

let requestChain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function rateLimited<T>(signal: AbortSignal | undefined, run: () => Promise<T>): Promise<T | null> {
  const next = requestChain.then(async () => {
    const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    if (signal?.aborted) return null;
    lastRequestAt = Date.now();
    return run();
  });
  requestChain = next.catch(() => undefined);
  return next;
}

async function nominatimSearch(params: Record<string, string>, signal?: AbortSignal): Promise<NominatimResult[] | null> {
  const qs = new URLSearchParams(params).toString();
  return rateLimited(signal, async () => {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${qs}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Geokodiranje ni uspelo (HTTP ${response.status}).`);
    return (await response.json()) as NominatimResult[];
  });
}

function toSuggestion(r: NominatimResult): PlaceSuggestion | null {
  const latitude = parseFloat(r.lat);
  const longitude = parseFloat(r.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const a = r.address ?? {};
  const name =
    r.name || a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || r.display_name.split(',')[0].trim();
  const region = a.state || a.county || a.region || null;
  const country = a.country || null;
  const label = [name, region && region !== name ? region : null, country && country !== name ? country : null]
    .filter(Boolean)
    .join(', ');
  return { id: String(r.place_id), name, country, label, latitude, longitude };
}

export async function searchPlaces(query: string, mode: PlaceMode, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const params: Record<string, string> = {
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
    'accept-language': 'en',
    q: query,
  };
  if (mode === 'settlement') params.featureType = 'settlement';
  else if (mode === 'country') params.featureType = 'country';

  const results = await nominatimSearch(params, signal);
  const seen = new Set<string>();
  return (results ?? [])
    .map(toSuggestion)
    .filter((s): s is PlaceSuggestion => s !== null && !seen.has(s.label) && !!seen.add(s.label));
}

/** Rezerva, ko koordinat ni iz izbranega predloga: strukturirana poizvedba, nato prosta fraza. */
export async function geocodeLocation(city: string, country: string): Promise<Coords | null> {
  const base = { format: 'jsonv2', limit: '1', 'accept-language': 'en' };

  if (city.trim() && country.trim()) {
    const structured = await nominatimSearch({ ...base, city: city.trim(), country: country.trim() });
    const hit = structured?.[0] && toSuggestion(structured[0]);
    if (hit) return { latitude: hit.latitude, longitude: hit.longitude };
  }

  const query = [city, country].filter((part) => part.trim().length > 0).join(', ');
  if (!query) return null;
  const free = await nominatimSearch({ ...base, q: query });
  const hit = free?.[0] && toSuggestion(free[0]);
  return hit ? { latitude: hit.latitude, longitude: hit.longitude } : null;
}
