'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import PlaceInput from '@/components/PlaceInput';
import { compressImage } from '@/lib/image';
import { geocodeLocation, type Coords } from '@/lib/geocoding';
import { setFlash } from '@/lib/flash';
import {
  deletePerson,
  errorMessage,
  getPerson,
  insertPerson,
  personName,
  personPhoto,
  updatePerson,
  uploadPersonPhoto,
  type PersonFields,
  type PersonRow,
  type PhotoPatch,
} from '@/lib/people';
import { useSession } from '@/lib/useSession';

const PICK_ERROR = 'Choose a place from the suggestions';

/** Danes kot "YYYY-MM-DD" v lokalnem času (toISOString bi lahko zamaknil dan). */
function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Besedilo, ki velja za potrjeno (izbrano s seznama ali naloženo iz obstoječega zapisa), glej mobilno app. */
const isUnconfirmed = (value: string, confirmed: string | null) => value.trim() !== '' && value !== confirmed;

export default function PersonForm() {
  const router = useRouter();
  const personId = useSearchParams().get('id');
  const isEditing = !!personId;
  const { session, loading: sessionLoading } = useSession();

  const [existing, setExisting] = useState<PersonRow | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [metDate, setMetDate] = useState(() => (isEditing ? '' : todayIso()));
  const [metLocation, setMetLocation] = useState('');
  const [metContext, setMetContext] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [birthday, setBirthday] = useState('');
  const [note, setNote] = useState('');

  // Potrjeni vnosi s seznama predlogov (+ koordinate); stari zapisi ostanejo veljavni, dokler jih ne spremeniš.
  const [confirmedCity, setConfirmedCity] = useState<string | null>(null);
  const [confirmedCountry, setConfirmedCountry] = useState<string | null>(null);
  const [confirmedMet, setConfirmedMet] = useState<string | null>(null);
  const [placeCoords, setPlaceCoords] = useState<Coords | null>(null);
  const [metCoords, setMetCoords] = useState<Coords | null>(null);

  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState('Saving…');

  // Neprijavljen uporabnik gre na prijavo (domači zaslon).
  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/');
  }, [sessionLoading, session, router]);

  // Pri urejanju naloži obstoječo osebo.
  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await getPerson(personId);
        if (cancelled) return;
        if (!row) {
          setLoadError('This person no longer exists.');
          return;
        }
        setExisting(row);
        setFirstName(row.first_name);
        setLastName(row.last_name);
        setMetDate(row.met_date ?? '');
        setMetLocation(row.met_location ?? '');
        setMetContext(row.met_context ?? '');
        setCity(row.city);
        setCountry(row.country);
        setBirthday(row.birthday ?? '');
        setNote(row.note ?? '');
        setConfirmedCity(row.city);
        setConfirmedCountry(row.country);
        setConfirmedMet(row.met_location ?? '');
        setPlaceCoords(row.latitude != null && row.longitude != null ? { latitude: row.latitude, longitude: row.longitude } : null);
        setMetCoords(
          row.met_latitude != null && row.met_longitude != null
            ? { latitude: row.met_latitude, longitude: row.met_longitude }
            : null,
        );
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  // Predogled izbrane slike (object URL se sprosti ob zamenjavi / odhodu).
  useEffect(() => {
    if (!newPhoto) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(newPhoto);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newPhoto]);

  const currentPhoto = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (existing && !removePhoto) return personPhoto(existing);
    return null;
  }, [photoPreview, existing, removePhoto]);

  const cityInvalid = isUnconfirmed(city, confirmedCity);
  const countryInvalid = isUnconfirmed(country, confirmedCountry);
  const metInvalid = isUnconfirmed(metLocation, confirmedMet);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // isti file je mogoče izbrati še enkrat
    if (!file) return;
    setNewPhoto(file);
    setRemovePhoto(false);
  };

  const onSave = async () => {
    if (saving || !session) return;
    setFormError(null);

    // Vsaj eno polje mora biti izpolnjeno (datum srečanja se ne šteje – nova oseba ga ima privzeto).
    const hasAnyDetail =
      [firstName, lastName, metLocation, metContext, city, country, birthday, note].some((v) => v.trim()) ||
      !!currentPhoto;
    if (!hasAnyDetail) {
      setFormError('Add at least one detail to save this person.');
      return;
    }
    if (cityInvalid || countryInvalid || metInvalid) {
      setShowErrors(true);
      setFormError(PICK_ERROR);
      return;
    }

    setSaving(true);
    try {
      // Kraj bivanja je neobvezen; brez mesta/države oseba nima točke na zemljevidu (lat/lng = null).
      let coords: Coords | null = null;
      if (city.trim() || country.trim()) {
        setSavingLabel('Finding location…');
        coords = placeCoords ?? (await geocodeLocation(city, country));
        if (!coords) {
          const place = [city.trim(), country.trim()].filter(Boolean).join(', ');
          if (!window.confirm(`We couldn't find "${place}" on the map. Save without a map location?`)) return;
        }
      }

      // Kraj srečanja: koordinate iz izbranega predloga; pri starem zapisu brez njih poskusimo geokodirati (brez blokade).
      let metCoordsFinal: Coords | null = metLocation.trim() ? metCoords : null;
      if (!metCoordsFinal && metLocation.trim()) {
        try {
          metCoordsFinal = await geocodeLocation(metLocation.trim(), '');
        } catch (e) {
          console.warn('Geokodiranje kraja srečanja ni uspelo:', e);
        }
      }

      // Fotografija: nova postane profilna (prva), ostale ostanejo; "remove" odstrani trenutno profilno.
      let photoPatch: PhotoPatch | null = null;
      const oldUrls = existing?.photo_urls?.length ? existing.photo_urls : existing?.photo_url ? [existing.photo_url] : [];
      const keep = removePhoto ? oldUrls.slice(1) : oldUrls;
      if (newPhoto) {
        setSavingLabel('Uploading photo…');
        const url = await uploadPersonPhoto(await compressImage(newPhoto));
        const urls = [url, ...keep];
        photoPatch = { photo_url: url, photo_urls: urls };
      } else if (removePhoto && oldUrls.length > 0) {
        photoPatch = { photo_url: keep[0] ?? null, photo_urls: keep.length > 0 ? keep : null };
      }

      setSavingLabel('Saving…');
      const fields: PersonFields = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country: country.trim(),
        city: city.trim(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        note: note.trim() || null,
        met_date: metDate || null,
        met_location: metLocation.trim() || null,
        met_context: metContext.trim() || null,
        met_latitude: metCoordsFinal?.latitude ?? null,
        met_longitude: metCoordsFinal?.longitude ?? null,
        birthday: birthday || null,
      };

      if (isEditing && personId) {
        await updatePerson(personId, fields, photoPatch);
        setFlash('Changes saved ✓');
      } else {
        await insertPerson(session.user.id, fields, photoPatch);
        setFlash('Person added ✓');
      }
      router.push('/');
    } catch (e) {
      console.error(e);
      setFormError(`Could not save: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!personId || saving) return;
    const name = existing ? personName(existing) : 'this person';
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deletePerson(personId);
      setFlash('Person deleted');
      router.push('/');
    } catch (e) {
      console.error(e);
      setFormError(`Could not delete: ${errorMessage(e)}`);
      setSaving(false);
    }
  };

  const back = (
    <Link href="/" className="flex min-h-12 min-w-12 items-center text-[17px] font-semibold text-terracotta-text" aria-label="Back">
      ‹ Back
    </Link>
  );
  const title = isEditing ? 'Edit person' : 'Add person';

  if (sessionLoading || loadingExisting) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-2">Loading…</div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md">
        <PageHeader title={title} left={back} />
        <p className="error-text px-4 pt-6">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      <PageHeader title={title} left={back} />

      <main className="flex flex-col gap-3 px-4 pt-4">
        {/* Fotografija */}
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sand bg-surface-muted text-3xl">
            {currentPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPhoto} alt="Selected photo" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>📷</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => cameraInput.current?.click()}>
              Take photo
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => galleryInput.current?.click()}>
              Choose from gallery
            </button>
            {currentPhoto ? (
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-danger"
                onClick={() => {
                  setNewPhoto(null);
                  setRemovePhoto(true);
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
          <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </div>

        {/* Ime */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="first-name">
              First name
            </label>
            <input id="first-name" className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="field-label" htmlFor="last-name">
              Last name
            </label>
            <input id="last-name" className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
          </div>
        </div>

        {/* Kje in kdaj sva se spoznala */}
        <h2 className="section-title">Where we met</h2>
        <PlaceInput
          label="Place"
          value={metLocation}
          onChange={(text) => {
            setMetLocation(text);
            setMetCoords(null);
          }}
          onSelect={(place) => {
            setMetLocation(place.label);
            setConfirmedMet(place.label);
            setMetCoords({ latitude: place.latitude, longitude: place.longitude });
          }}
          mode="any"
          placeholder="e.g. Izola, Slovenia"
          error={showErrors && metInvalid ? PICK_ERROR : null}
        />
        <div>
          <label className="field-label" htmlFor="met-context">
            Details (optional)
          </label>
          <input
            id="met-context"
            className="field"
            value={metContext}
            onChange={(e) => setMetContext(e.target.value)}
            placeholder="e.g. Spain, Erasmus"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="met-date">
            Date we met
          </label>
          <div className="flex items-center gap-2">
            <input
              id="met-date"
              className="field"
              type="date"
              max={todayIso()}
              value={metDate}
              onChange={(e) => setMetDate(e.target.value)}
            />
            {metDate ? (
              <button type="button" className="btn btn-secondary px-3" onClick={() => setMetDate('')} aria-label="Clear date">
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* Kje oseba živi */}
        <h2 className="section-title">Lives in</h2>
        <PlaceInput
          label="City"
          value={city}
          onChange={(text) => {
            setCity(text);
            setPlaceCoords(null);
          }}
          onSelect={(place) => {
            setCity(place.name);
            setConfirmedCity(place.name);
            if (place.country) {
              setCountry(place.country);
              setConfirmedCountry(place.country);
            }
            setPlaceCoords({ latitude: place.latitude, longitude: place.longitude });
          }}
          mode="settlement"
          placeholder="e.g. Ljubljana"
          error={showErrors && cityInvalid ? PICK_ERROR : null}
        />
        <PlaceInput
          label="Country"
          value={country}
          onChange={(text) => {
            setCountry(text);
            setPlaceCoords(null);
          }}
          onSelect={(place) => {
            const picked = place.country ?? place.name;
            setCountry(picked);
            setConfirmedCountry(picked);
            // Brez mesta je točka središče države; z izbranim mestom in drugo državo se koordinate izračunajo ob shranjevanju.
            if (!city.trim()) setPlaceCoords({ latitude: place.latitude, longitude: place.longitude });
            else if (picked !== country) setPlaceCoords(null);
          }}
          mode="country"
          placeholder="e.g. Slovenia"
          error={showErrors && countryInvalid ? PICK_ERROR : null}
        />

        {/* Rojstni dan */}
        <h2 className="section-title">Birthday</h2>
        <div className="flex items-center gap-2">
          <input
            className="field"
            type="date"
            max={todayIso()}
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            aria-label="Birthday"
          />
          {birthday ? (
            <button type="button" className="btn btn-secondary px-3" onClick={() => setBirthday('')} aria-label="Clear birthday">
              ✕
            </button>
          ) : null}
        </div>

        {/* Beležka */}
        <h2 className="section-title">Notes</h2>
        <textarea className="field min-h-28" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering…" />

        {formError ? (
          <p role="alert" className="error-text">
            {formError}
          </p>
        ) : null}

        <button type="button" className="btn btn-primary mt-3 text-lg" onClick={onSave} disabled={saving}>
          {saving ? savingLabel : isEditing ? 'Save changes' : 'Save person'}
        </button>

        {isEditing ? (
          <button type="button" className="btn btn-danger mt-1" onClick={onDelete} disabled={saving}>
            Delete person
          </button>
        ) : null}
      </main>
    </div>
  );
}
