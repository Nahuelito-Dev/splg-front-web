import type { Label } from '../../../utils/statusLabels';

/** Sin umbral fijo de la API: bajo (agotándose) o sin stock, para que el equipo repongá a tiempo. */
export const stockLabel = (stock: number): Label => {
  if (stock <= 0) return { text: 'Sin stock', tone: 'danger' };
  if (stock < 20) return { text: `${stock} u.`, tone: 'warn' };
  return { text: `${stock} u.`, tone: 'success' };
};
