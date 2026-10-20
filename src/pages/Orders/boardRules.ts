import type { Order } from '../../services/api/types';

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
 * Aviso de columna incompleta (la API trae hasta `BOARD_PAGE_SIZE` por columna). En las etapas de espera la API
 * devuelve los más viejos primero, así que lo que queda afuera son los más nuevos; en «En camino», los más viejos;
 * en «Entregados hoy», las entregas más antiguas del día.
 */
export const truncationNote = (status: BoardStatus, fetched: Order[], total: number | null): string | null => {
  if (total === null || total <= fetched.length) return null;
  const missing = total - fetched.length;
  switch (status) {
    case 'pending':
    case 'accepted':
      return `Hay ${total} en total: se muestran los ${fetched.length} más viejos y quedan afuera los ${missing} más nuevos.`;
    case 'delivered':
      return `Hoy se entregaron ${total}: se muestran las ${fetched.length} últimas y quedan afuera las ${missing} primeras.`;
    default:
      return `Hay ${total} en total: se muestran los ${fetched.length} más recientes y quedan afuera los ${missing} más viejos.`;
  }
};

/** Filtro de texto del tablero: cliente, chofer, calle o id corto del pedido. */
export const matchesBoardSearch = (order: Order, term: string): boolean => {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [order.customer?.full_name, order.delivery_name, order.delivery_address?.street, order.order_id.slice(-6)]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(needle));
};
