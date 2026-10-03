import type { Order } from '../../services/api/types';

export interface CustomerStats {
  /** Suma de los pedidos entregados (los cancelados y los que siguen en curso no cuentan como compra). */
  totalPurchased: number;
  /** Cuántos pedidos tiene en total, según la API (`total` del listado). */
  ordersCount: number;
  /** Fecha del último pedido entregado (coherente con el total comprado), o null si no tiene ninguno. */
  lastPurchaseAt: string | null;
  /** Los montos salen de una muestra: el cliente tiene más pedidos de los que se traen de una vez. */
  partial: boolean;
}

/**
 * Los números de la portada de un cliente, calculados sobre los últimos pedidos que trae la API (`orders`, de a
 * `limit` como máximo) y el `total` real del listado. Si hay más pedidos que los traídos, `partial` avisa que el
 * monto es de los más recientes.
 */
export const customerStats = (orders: Order[], total: number): CustomerStats => {
  const delivered = orders.filter((order) => order.status === 'delivered');
  const lastPurchaseAt = delivered.reduce<string | null>(
    (latest, order) => (latest === null || order.created_at > latest ? order.created_at : latest),
    null,
  );
  return {
    totalPurchased: delivered.reduce((sum, order) => sum + order.total_amount, 0),
    ordersCount: total,
    lastPurchaseAt,
    partial: total > orders.length,
  };
};
