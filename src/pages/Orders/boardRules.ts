import type { Order } from '../../services/api/types';
import { argentinaDay } from '../../utils/format';

/** Las columnas del tablero de despacho, en el orden en que un pedido las recorre. */
export const BOARD_STATUSES = ['pending', 'accepted', 'out_for_delivery', 'delivered'] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

/** Cuántos pedidos trae cada columna como máximo (el tope de la API): arriba de eso se avisa que hay más. */
export const BOARD_PAGE_SIZE = 100;

export const COLUMN_TITLE: Record<BoardStatus, string> = {
  pending: 'Pendientes',
  accepted: 'Aceptados',
  out_for_delivery: 'En camino',
  delivered: 'Entregados hoy',
};

export const COLUMN_EMPTY: Record<BoardStatus, string> = {
  pending: 'No hay pedidos esperando chofer',
  accepted: 'Ningún pedido aceptado sin salir',
  out_for_delivery: 'Nadie está repartiendo',
  delivered: 'Todavía no se entregó nada hoy',
};

/** De qué momento corre el reloj de la tarjeta: cuánto lleva el pedido en la etapa en que está. */
export const stageStartedAt = (order: Order): string => {
  switch (order.status) {
    case 'accepted':
      return order.accepted_at ?? order.created_at;
    case 'out_for_delivery':
      return order.on_the_way_at ?? order.accepted_at ?? order.created_at;
    case 'delivered':
      return order.actual_delivery_date ?? order.created_at;
    default:
      return order.created_at;
  }
};

/** Los entregados que pertenecen al día de hoy (calendario de Buenos Aires, como el resto del panel). */
export const deliveredToday = (orders: Order[], now: Date = new Date()): Order[] => {
  const today = argentinaDay(now);
  return orders.filter((order) => order.actual_delivery_date && argentinaDay(order.actual_delivery_date) === today);
};

/**
 * Orden dentro de una columna: en las que esperan acción, el que más lleva primero; en «Entregados hoy», el último
 * entregado arriba.
 */
export const sortColumn = (status: BoardStatus, orders: Order[]): Order[] =>
  [...orders].sort((a, b) => {
    const diff = new Date(stageStartedAt(a)).getTime() - new Date(stageStartedAt(b)).getTime();
    return status === 'delivered' ? -diff : diff;
  });

/**
 * Aviso de columna incompleta. La API lista de más nuevo a más viejo y no deja pedir el orden inverso: en las etapas
 * de espera, lo que queda afuera son los más viejos (justo los que más llevan esperando). En «Entregados hoy», si el
 * último traído sigue siendo de hoy puede haber más entregas de hoy sin mostrar (el filtro de fechas de la API es por
 * alta, no por entrega).
 */
export const truncationNote = (
  status: BoardStatus,
  fetched: Order[],
  total: number | null,
  now: Date = new Date(),
): string | null => {
  if (total === null || total <= fetched.length) return null;
  if (status !== 'delivered') {
    return `Hay ${total} en total: se muestran los ${fetched.length} más recientes y quedan afuera los ${total - fetched.length} más viejos.`;
  }
  const last = fetched[fetched.length - 1];
  const lastIsToday = Boolean(last?.actual_delivery_date) && deliveredToday([last], now).length === 1;
  return lastIsToday
    ? `Se miran las ${fetched.length} entregas más recientes de ${total}: puede haber más de hoy sin mostrar.`
    : null;
};

/** Filtro de texto del tablero: cliente, chofer, calle o id corto del pedido. */
export const matchesBoardSearch = (order: Order, term: string): boolean => {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [order.customer?.full_name, order.delivery_name, order.delivery_address?.street, order.order_id.slice(-6)]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(needle));
};
