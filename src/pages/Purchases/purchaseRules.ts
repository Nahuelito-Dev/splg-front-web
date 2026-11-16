import type { PendingItem, PurchaseOrder, PurchaseOrderItem } from '../../services/api/types';

type OrderStatus = PurchaseOrder['status'];

/** Qué se puede hacer con una orden según su estado (las mismas transiciones que la API). */
export const orderActions = (status: OrderStatus) => ({
  /** Sólo en borrador. */
  canEdit: status === 'draft',
  canSend: status === 'draft',
  /**
   * Desde borrador o enviada. Con recepciones (orden recibida o parcial) también se ofrece: la API responde 409 y
   * dice qué hacer (anular las recepciones o cerrar con faltante). Cerrada o cancelada ya no tiene vuelta.
   */
  canCancel: status === 'draft' || status === 'sent' || status === 'partially_received' || status === 'received',
  /** Lo que falta ya no llega: sólo con una recepción parcial. */
  canCloseShort: status === 'partially_received',
  canReceive: status === 'sent' || status === 'partially_received',
});

export interface ReceiptRowDefaults {
  gasCylinderId: string;
  type: string;
  pending: number;
  quantityFull: number;
  quantityEmptyOut: number;
  unitCost: number;
}

/**
 * Los renglones de una recepción contra una orden: sólo lo que falta recibir, a lo pedido y al costo de la orden. Las
 * vacías que se lleva la planta arrancan en lo que quedó por canjear, sin pasar de lo que se recibe.
 */
export const receiptRowsFromPending = (pending: PendingItem[], items: PurchaseOrderItem[]): ReceiptRowDefaults[] =>
  pending
    .filter((p) => p.pending > 0)
    .map((p) => {
      const cost = items.find((i) => i.gasCylinderId === p.gasCylinderId)?.unitCost ?? 0;
      return {
        gasCylinderId: p.gasCylinderId,
        type: p.gasCylinderType,
        pending: p.pending,
        quantityFull: p.pending,
        quantityEmptyOut: Math.min(p.pending, Math.max(0, p.emptiesToExchange - p.received)),
        unitCost: cost,
      };
    });
