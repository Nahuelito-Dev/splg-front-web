import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeModeContext } from './themeModeContextValue';
import {
  readStoredThemeMode,
  resolveThemeMode,
  systemPrefersDark,
  writeStoredThemeMode,
  type ResolvedThemeMode,
  type ThemeMode,
} from './themeMode';

const applyResolvedMode = (resolved: ResolvedThemeMode) => {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

interface Props {
  children: ReactNode;
}

/**
 * Selector de tema con tres valores (claro/oscuro/sistema), persistido en
 * localStorage. El script de `index.html` ya puso la clase `dark` correcta
 * antes de que React monte (sin parpadeo); este provider sólo toma el control
 * a partir de ahí y reacciona a cambios (toggle manual o del sistema).
 */
export const ThemeModeProvider = ({ children }: Props) => {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredThemeMode() ?? 'system');
  const [resolvedMode, setResolvedMode] = useState<ResolvedThemeMode>(() => resolveThemeMode(mode));

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStoredThemeMode(next);
  }, []);

  useEffect(() => {
    const resolved = resolveThemeMode(mode);
    setResolvedMode(resolved);
    applyResolvedMode(resolved);
  }, [mode]);

  // Con "system", seguir el cambio en vivo si la persona cambia el tema del sistema operativo.
  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = systemPrefersDark() ? 'dark' : 'light';
      setResolvedMode(resolved);
      applyResolvedMode(resolved);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode, setMode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};
