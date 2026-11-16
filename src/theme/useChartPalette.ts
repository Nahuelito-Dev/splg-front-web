import brand from './brand.json';
import { useSyncExternalStore } from 'react';
import { companyThemeStore } from './companyTheme';
import { BRASA_TOKENS } from './themeTokens';
import { useThemeMode } from './useThemeMode';

/**
 * Los gráficos (recharts) no leen clases de Tailwind: sus colores son datos
 * (stroke, fill) que hay que elegir a mano según el tema. Las series de marca
 * y las superficies (grilla, cursor, tooltip) salen de los tokens activos
 * (sin tema, los de Brasa); los tonos de estado mantienen su semántica.
 */
export const useChartPalette = () => {
  const { resolvedMode } = useThemeMode();
  const company = useSyncExternalStore(companyThemeStore.subscribe, companyThemeStore.getSnapshot);
  const isDark = resolvedMode === 'dark';
  const tokens = company?.[resolvedMode];
  const surfaces = tokens ?? BRASA_TOKENS[resolvedMode];

  return {
    isDark,
    /** Líneas de la grilla. */
    grid: surfaces.outlineSoft,
    /** Texto de los ejes, el más fuerte (categorías). */
    axisStrong: isDark ? brand.dark.muted : brand.tinta['500'],
    /** Texto de los ejes (valores): el mismo gris con contraste AA que las categorías. */
    axis: isDark ? brand.dark.muted : brand.tinta['500'],
    /** Fondo del cursor al pasar el mouse por una barra/punto. */
    cursor: surfaces.surfaceHover,
    /** Fondo y borde del tooltip. */
    tooltipBg: surfaces.surface,
    tooltipBorder: surfaces.outline,
    /** Roles de identidad: cambian junto con el tema de la distribuidora. */
    primary: tokens?.primary ?? brand.llama['500'],
    accent: tokens?.accent ?? brand.gas['500'],
    primarySoft: tokens?.primarySoft ?? (isDark ? brand.dark.primarySoft : brand.llama['50']),
    ink: isDark ? brand.dark.ink : brand.tinta['900'],
    muted: isDark ? brand.dark.muted : brand.tinta['400'],
    faint: isDark ? brand.dark.faint : brand.tinta['400'],
    success: isDark ? brand.dark.status.success : brand.status.success,
    danger: isDark ? brand.dark.status.danger : brand.status.danger,
    warn: isDark ? brand.dark.status.warn : brand.status.warn,
    info: isDark ? brand.dark.status.info : brand.status.info,
  };
};
