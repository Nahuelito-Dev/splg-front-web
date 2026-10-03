import brand from '../../../theme/brand.json';
import { useThemeMode } from '../../../theme/useThemeMode';
import type { Order } from '../../../services/api/types';

/** El color de cada estado de pedido en los gráficos (recharts no lee clases de Tailwind). */
export const useStatusColors = (): Record<Order['status'], string> => {
  const { resolvedMode } = useThemeMode();
  const status = resolvedMode === 'dark' ? brand.dark.status : brand.status;
  return {
    reserved: brand.tinta['400'],
    pending: status.warn,
    accepted: status.info,
    out_for_delivery: brand.llama['500'],
    delivered: status.success,
    cancelled: status.danger,
  };
};
