'use client';

import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type PlaceMode, type PlaceSuggestion } from '@/lib/geocoding';

const DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 3;

type Props = {
  label: string;
  value: string;
  /** Vsako ročno tipkanje (izbira predloga kliče samo onSelect). */
  onChange: (text: string) => void;
  /** Uporabnik je izbral predlog – vsebuje tudi točne koordinate iz Nominatim. */
  onSelect: (place: PlaceSuggestion) => void;
  mode: PlaceMode;
  placeholder?: string;
  error?: string | null;
};

/** Polje s predlogi krajev (Nominatim) pod njim – enak vzorec kot PlaceAutocompleteInput v mobilni app. */
export default function PlaceInput({ label, value, onChange, onSelect, mode, placeholder, error }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [noResults, setNoResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const handleChange = (text: string) => {
    onChange(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setNoResults(false);

    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await searchPlaces(text.trim(), mode, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(results);
          setNoResults(results.length === 0);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.warn('Iskanje krajev ni uspelo:', e);
          setSuggestions([]);
        }
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = (place: PlaceSuggestion) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setSuggestions([]);
    setNoResults(false);
    onSelect(place);
  };

  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className={`field ${error ? 'field-error' : ''}`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
      />
      {suggestions.length > 0 ? (
        <ul className="mt-1.5 overflow-hidden rounded-xl border border-sand bg-surface">
          {suggestions.map((s, i) => (
            <li key={s.id} className={i > 0 ? 'border-t border-sand' : ''}>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-[15px] active:bg-surface-muted"
                onClick={() => handleSelect(s)}
              >
                <span aria-hidden>📍</span>
                <span className="flex-1">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {noResults && suggestions.length === 0 ? (
        <p className="mt-1.5 text-[13px] text-ink-2">No matching places found – check the spelling</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
