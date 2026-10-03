import brand from '../../../theme/brand.json';
import { useChartPalette } from '../../../theme/useChartPalette';

/**
 * Colores de las series de los gráficos, con buen contraste contra la tarjeta en los dos temas.
 * Los primeros son de tonos bien distintos (naranja, azul, verde); los naranjas parecidos van al final.
 */
export const useSeriesColors = (): string[] => {
  const { isDark } = useChartPalette();
  return [
    brand.llama['500'],
    isDark ? brand.dark.status.info : brand.status.info,
    isDark ? brand.dark.status.success : brand.status.success,
    isDark ? brand.dark.status.warn : brand.status.warn,
    brand.gas['500'],
    isDark ? brand.dark.muted : brand.tinta['400'],
  ];
};

/** Estilo del cuadro flotante (tooltip) de recharts. */
export const useTooltipStyle = () => {
  const palette = useChartPalette();
  return {
    borderRadius: 10,
    border: `1px solid ${palette.tooltipBorder}`,
    backgroundColor: palette.tooltipBg,
    color: palette.isDark ? brand.dark.ink : brand.tinta['900'],
    fontSize: 12,
  };
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Número corto para el eje de un gráfico: 1,5 M, 800 mil. */
export const formatAxis = (value: number): string => compact.format(value);
