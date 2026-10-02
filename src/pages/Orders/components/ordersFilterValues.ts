/** Búsqueda y rango de fechas del listado de Pedidos: el estado se filtra con las pestañas (`OrderStatusTabs`). */
export interface OrdersToolbarFilters {
  search: string;
  from: string;
  to: string;
}

export const EMPTY_TOOLBAR_FILTERS: OrdersToolbarFilters = { search: '', from: '', to: '' };
