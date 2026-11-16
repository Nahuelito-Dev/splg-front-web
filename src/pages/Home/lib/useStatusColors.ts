import { useChartPalette } from '../../../theme/useChartPalette';
import type { Order } from '../../../services/api/types';

/** El color de cada estado de pedido en los gráficos (recharts no lee clases de Tailwind). */
export const useStatusColors = (): Record<Order['status'], string> => {
  const palette = useChartPalette();
  return {
    reserved: palette.faint,
    pending: palette.warn,
    accepted: palette.info,
    out_for_delivery: palette.info,
    delivered: palette.success,
    cancelled: palette.danger,
  };
};
