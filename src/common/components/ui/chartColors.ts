import { useChartPalette } from '../../../theme/useChartPalette';

/**
 * Colores de las series de los gráficos, con buen contraste contra la tarjeta en los dos temas.
 * Los primeros son de tonos bien distintos; los colores de estado no se usan
 * para series de identidad, así no compiten con gráficos de estados.
 */
export const useSeriesColors = (): string[] => {
  const palette = useChartPalette();
  return [palette.primary, palette.accent, palette.muted, palette.info, palette.success, palette.warn];
};

/** Estilo del cuadro flotante (tooltip) de recharts. */
export const useTooltipStyle = () => {
  const palette = useChartPalette();
  return {
    borderRadius: 10,
    border: `1px solid ${palette.tooltipBorder}`,
    backgroundColor: palette.tooltipBg,
    color: palette.ink,
    fontSize: 12,
  };
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Número corto para el eje de un gráfico: 1,5 M, 800 mil. */
export const formatAxis = (value: number): string => compact.format(value);
