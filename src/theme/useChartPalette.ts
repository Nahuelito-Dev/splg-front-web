import brand from './brand.json';
import { useSyncExternalStore } from 'react';
import { companyThemeStore } from './companyTheme';
import { useThemeMode } from './useThemeMode';

/**
 * Los gráficos (recharts) no leen clases de Tailwind: sus colores son datos
 * (stroke, fill) que hay que elegir a mano según el tema. Las series de marca
 * salen de los tokens activos; los tonos de estado mantienen su semántica.
 */
export const useChartPalette = () => {
  const { resolvedMode } = useThemeMode();
  const company = useSyncExternalStore(companyThemeStore.subscribe, companyThemeStore.getSnapshot);
  const isDark = resolvedMode === 'dark';
  const tokens = company?.[resolvedMode];

  return {
    isDark,
    /** Líneas de la grilla. */
    grid: isDark ? brand.dark.outlineSoft : brand.tinta['100'],
    /** Texto de los ejes, el más fuerte (categorías). */
    axisStrong: isDark ? brand.dark.muted : brand.tinta['500'],
    /** Texto de los ejes (valores): el mismo gris con contraste AA que las categorías. */
    axis: isDark ? brand.dark.muted : brand.tinta['500'],
    /** Fondo del cursor al pasar el mouse por una barra/punto. */
    cursor: isDark ? brand.dark.surfaceHover : brand.tinta['50'],
    /** Fondo y borde del tooltip. */
    tooltipBg: isDark ? brand.dark.surface : '#FFFFFF',
    tooltipBorder: isDark ? brand.dark.outline : brand.tinta['200'],
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
