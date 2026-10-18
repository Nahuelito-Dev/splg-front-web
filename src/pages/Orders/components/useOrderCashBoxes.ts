import { useCashBoxes } from '../../../services/queries/finance';

/**
 * Las cajas de efectivo activas donde puede entrar el efectivo que el administrador cobra sobre un pedido. Si la distribuidora
 * tiene alguna de efectivo, elegirla es obligatorio (lo exige la API); si no tiene ninguna, el cobro se registra sin movimiento.
 */
export const useOrderCashBoxes = (enabled: boolean) => {
  const query = useCashBoxes({ page: 0, pageSize: 100 }, { kind: 'cash' }, { enabled });
  const boxes = query.data?.data ?? [];
  return { boxes, loading: enabled && query.isPending, failed: query.isError, required: boxes.length > 0 };
};
