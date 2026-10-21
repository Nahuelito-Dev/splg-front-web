import brand from '../brand.json';
import type { ResolvedThemeMode } from '../themeMode';

const { tinta, llama, dark } = brand;

/** `#RRGGBB` de la marca con transparencia: los canales salen del token, no se escriben a mano. */
export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Valores de la marca que cambian con el modo, para los overrides de los componentes de MUI. */
export const surfaceTokens = (mode: ResolvedThemeMode) => {
  const isDark = mode === 'dark';
  return {
    outline: isDark ? dark.outline : tinta['200'],
    surfaceHover: isDark ? dark.surfaceHover : tinta['50'],
    surfaceMuted: isDark ? dark.surfaceMuted : tinta['100'],
    ink: isDark ? dark.ink : tinta['900'],
    muted: isDark ? dark.muted : tinta['500'],
    primary: isDark ? dark.primaryStrong : llama['600'],
    backdrop: isDark ? withAlpha(tinta['950'], 0.72) : withAlpha(tinta['900'], 0.42),
  };
};

export const SHADOW_MENU = `0 12px 28px -8px ${withAlpha(tinta['900'], 0.22)}, 0 2px 6px ${withAlpha(tinta['900'], 0.08)}`;
export const SHADOW_DIALOG = `0 25px 50px -12px ${withAlpha(tinta['900'], 0.28)}`;
