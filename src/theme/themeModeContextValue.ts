import { createContext } from 'react';
import type { ResolvedThemeMode, ThemeMode } from './themeMode';

export interface ThemeModeContextValue {
  /** Lo que eligió la persona: claro, oscuro o "como el sistema". */
  mode: ThemeMode;
  /** El que realmente se aplica (resuelve "system" contra el sistema operativo). */
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);
