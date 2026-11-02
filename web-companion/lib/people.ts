import { supabase, PERSON_PHOTOS_BUCKET } from './supabase';

/** Stolpci tabele `people`, ki jih uporablja spletna companion (ostali – tagi, kontakti, linked_user_id – ostanejo nedotaknjeni). */
export type PersonRow = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  photo_urls: string[] | null;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  met_date: string | null;
  met_location: string | null;
  met_context: string | null;
  met_latitude: number | null;
  met_longitude: number | null;
  birthday: string | null;
  created_at: string;
};

const COLUMNS =
  'id, first_name, last_name, photo_url, photo_urls, country, city, latitude, longitude, note, met_date, met_location, met_context, met_latitude, met_longitude, birthday, created_at';

/** Polja, ki jih obrazec zapiše (pri vstavljanju + user_id; fotografije se dodajo samo, če so se spremenile). */
export type PersonFields = Omit<PersonRow, 'id' | 'created_at' | 'photo_url' | 'photo_urls'>;

/** Berljivo sporočilo iz napake (Supabase vrača navadne objekte z `message`, ne instanc Error). */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Unknown error';
}

export function personName(p: Pick<PersonRow, 'first_name' | 'last_name'>): string {
  return `${p.first_name} ${p.last_name}`.trim() || 'Unnamed person';
}

export function personPlace(p: Pick<PersonRow, 'city' | 'country' | 'met_location'>): string {
  const home = [p.city, p.country].map((s) => s.trim()).filter(Boolean).join(', ');
  return home || p.met_location?.trim() || '';
}

export function personPhoto(p: Pick<PersonRow, 'photo_url' | 'photo_urls'>): string | null {
  return p.photo_urls?.[0] ?? p.photo_url ?? null;
}

/** Zadnjih `limit` oseb prijavljenega uporabnika (najnovejše najprej). */
export async function listRecentPeople(userId: string, limit = 20): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from('people')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PersonRow[];
}

export async function getPerson(id: string): Promise<PersonRow | null> {
  const { data, error } = await supabase.from('people').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

export type PhotoPatch = { photo_url: string | null; photo_urls: string[] | null };

export async function insertPerson(userId: string, fields: PersonFields, photo: PhotoPatch | null): Promise<void> {
  const { error } = await supabase.from('people').insert({ ...fields, ...(photo ?? {}), user_id: userId });
  if (error) throw error;
}

export async function updatePerson(id: string, fields: PersonFields, photo: PhotoPatch | null): Promise<void> {
  const { error } = await supabase
    .from('people')
    .update({ ...fields, ...(photo ?? {}) })
    .eq('id', id);
  if (error) throw error;
}

/** Izbriše osebo (kontakti se izbrišejo samodejno – on delete cascade). */
export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

/** Naloži že stisnjeno JPEG sliko v bucket `person-photos` (enaka pot kot mobilna app) in vrne javni URL. */
export async function uploadPersonPhoto(blob: Blob): Promise<string> {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from(PERSON_PHOTOS_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(PERSON_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}
