import brand from './brand.json';
import { useThemeMode } from './useThemeMode';

/**
 * Los gráficos (recharts) no leen clases de Tailwind: sus colores son datos
 * (stroke, fill) que hay que elegir a mano según el tema. Esto arma ese set a
 * partir de `brand.json`, con el mismo criterio en todos los gráficos.
 */
export const useChartPalette = () => {
  const { resolvedMode } = useThemeMode();
  const isDark = resolvedMode === 'dark';

  return {
    isDark,
    /** Líneas de la grilla. */
    grid: isDark ? brand.dark.outlineSoft : brand.tinta['100'],
    /** Texto de los ejes, el más fuerte (categorías). */
    axisStrong: isDark ? brand.dark.muted : brand.tinta['500'],
    /** Texto de los ejes, el más tenue (valores). */
    axis: isDark ? brand.dark.faint : brand.tinta['400'],
    /** Fondo del cursor al pasar el mouse por una barra/punto. */
    cursor: isDark ? brand.dark.surfaceHover : brand.tinta['50'],
    /** Fondo y borde del tooltip. */
    tooltipBg: isDark ? brand.dark.surface : '#FFFFFF',
    tooltipBorder: isDark ? brand.dark.outline : brand.tinta['200'],
  };
};
