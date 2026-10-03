/** Búsqueda y rango de fechas del listado de Pedidos: el estado se filtra con las pestañas (`OrderStatusTabs`). */
export interface OrdersToolbarFilters {
  search: string;
  from: string;
  to: string;
}

export const EMPTY_TOOLBAR_FILTERS: OrdersToolbarFilters = { search: '', from: '', to: '' };

/** El navegador deja escribir fechas fuera de min/max: un rango invertido no se manda (la API responde 400). */
export const isInvertedRange = ({ from, to }: Pick<OrdersToolbarFilters, 'from' | 'to'>): boolean =>
  Boolean(from && to && from > to);
