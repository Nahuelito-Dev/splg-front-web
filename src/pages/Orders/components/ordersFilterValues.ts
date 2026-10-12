import type { Order } from '../../../services/api/types';

/** Búsqueda, estado de cobro y rango de fechas del listado de Pedidos: el estado del pedido va por pestañas (`OrderStatusTabs`). */
export interface OrdersToolbarFilters {
  search: string;
  /** Vacío = todos los estados de cobro. */
  payment: NonNullable<Order['paymentStatus']> | '';
  from: string;
  to: string;
}

export const EMPTY_TOOLBAR_FILTERS: OrdersToolbarFilters = { search: '', payment: '', from: '', to: '' };

/** El navegador deja escribir fechas fuera de min/max: un rango invertido no se manda (la API responde 400). */
export const isInvertedRange = ({ from, to }: Pick<OrdersToolbarFilters, 'from' | 'to'>): boolean =>
  Boolean(from && to && from > to);
