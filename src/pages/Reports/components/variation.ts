import type { KpiTrend } from '../../../common/components/ui';

const percent = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

/** Variación contra el período anterior para la píldora de una tarjeta. */
export const variationPill = (current: number, previous: number): { text: string; trend: KpiTrend } => {
  // El período anterior estuvo en cero: no hay porcentaje posible, pero que ahora haya algo es una suba.
  if (previous === 0) return current === 0 ? { text: 'Sin cambios', trend: 'neutral' } : { text: 'Nuevo', trend: 'up' };
  const change = ((current - previous) / previous) * 100;
  const text = `${percent.format(change)}%`;
  return { text, trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
};
