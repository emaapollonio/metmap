const FLASH_KEY = 'metmap_flash';

/** Zapomni si kratko potrditev (npr. "Person added ✓"), ki jo pokaže domači zaslon po vrnitvi z obrazca. */
export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // sessionStorage ni na voljo – potrditev preskočimo
  }
}

/** Prebere in pobriše shranjeno potrditev. */
export function takeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (message) sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
