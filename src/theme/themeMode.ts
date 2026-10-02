export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export const THEME_MODE_KEY = 'themeMode';

const isThemeMode = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark' || value === 'system';

/** Preferencia guardada, si hay una y es válida. localStorage puede no estar disponible (modo privado). */
export const readStoredThemeMode = (): ThemeMode | null => {
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const writeStoredThemeMode = (mode: ThemeMode): void => {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Sin localStorage no hay nada para persistir; el modo sigue funcionando en memoria.
  }
};

export const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

/** El modo "system" se resuelve contra el sistema operativo; los otros dos son directos. */
export const resolveThemeMode = (mode: ThemeMode): ResolvedThemeMode =>
  mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
