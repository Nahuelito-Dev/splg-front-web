import { z } from 'zod';
import type { Order, UpdateOrderBody } from '../../../services/api/types';
import { argentinaDay } from '../../../utils/format';

/**
 * Por qué un pedido no se puede editar de antemano (la API contesta 409), o `null` si se puede intentar.
 *
 * El back también rechaza si el medio de pago es MercadoPago o el pago no está pendiente. El pedido ya trae
 * `paymentMethodDetail` (`cash | mercadopago | transfer`) y `paymentStatus`, pero acá sólo se bloquea de antemano lo
 * que no depende de ellos (pedido no pendiente, con chofer, o con un checkout de MercadoPago en `payment_url`); el
 * resto se intenta y el 409 del back se muestra con su mensaje.
 */
export const orderEditBlockedReason = (order: Pick<Order, 'status' | 'delivery_id' | 'payment_url'>): string | null => {
  if (order.status !== 'pending') return 'sólo se edita un pedido pendiente';
  if (order.delivery_id) return 'ya tiene chofer asignado';
  if (order.payment_url) return 'tiene un pago de MercadoPago en curso: cancelalo y cargá uno nuevo';
  return null;
};

export interface OrderEditItem {
  gasCylinderId: string;
  quantity: number;
}

export interface OrderEditValues {
  addressId: string;
  /** `''` no toca la franja; `'none'` la saca; si no, el id de la franja. */
  timeSlotId: string;
  /** YYYY-MM-DD; `''` no toca la fecha. */
  scheduledDate: string;
  /** `''` no toca el medio de pago. */
  paymentMethod: '' | 'cash' | 'transfer';
  notes: string;
  items: OrderEditItem[];
}

export interface OrderEditInitial {
  addressId: string;
  scheduledDate: string;
  notes: string;
  items: OrderEditItem[];
}

const sameItems = (a: OrderEditItem[], b: OrderEditItem[]) => {
  const key = (items: OrderEditItem[]) =>
    items
      .map((item) => `${item.gasCylinderId}:${Number(item.quantity)}`)
      .sort()
      .join('|');
  return key(a) === key(b);
};

/**
 * El cuerpo de `PATCH /orders/:id` con sólo lo que cambió: la API reemplaza todos los renglones si llegan `items`
 * y recalcula total y stock, así que no se manda lo que no se tocó.
 */
export const buildOrderUpdate = (initial: OrderEditInitial, values: OrderEditValues): UpdateOrderBody => {
  const body: UpdateOrderBody = {};
  if (values.addressId && values.addressId !== initial.addressId) body.addressId = values.addressId;
  if (values.timeSlotId === 'none') body.timeSlotId = null;
  else if (values.timeSlotId) body.timeSlotId = values.timeSlotId;
  if (values.scheduledDate && values.scheduledDate !== initial.scheduledDate) body.scheduledDate = values.scheduledDate;
  // Con franja nueva y la fecha ya vencida, la API pide la fecha: se manda la que está.
  if (body.timeSlotId && !body.scheduledDate && values.scheduledDate) body.scheduledDate = values.scheduledDate;
  if (values.paymentMethod) body.paymentMethod = values.paymentMethod;
  if (values.notes.trim() !== initial.notes.trim()) body.notes = values.notes.trim();
  if (!sameItems(initial.items, values.items)) {
    body.items = values.items.map((item) => ({ gasCylinderId: item.gasCylinderId, quantity: Number(item.quantity) }));
  }
  return body;
};

/**
 * Las mismas reglas que `UpdateOrderDto` y `UpdateOrderUseCase`: al menos un renglón, cantidades enteras de 1 a 999,
 * sin repetir garrafa, y una fecha agendada nueva nunca pasada (con o sin franja). La fecha que ya tenía el pedido se
 * deja como está aunque haya vencido: no se está cambiando.
 */
export const orderEditSchema = (initialScheduledDate: string) =>
  z
    .object({
      addressId: z.string(),
      timeSlotId: z.string(),
      scheduledDate: z.string(),
      paymentMethod: z.enum(['', 'cash', 'transfer']),
      notes: z.string(),
      items: z
        .array(
          z.object({
            gasCylinderId: z.string().min(1, 'Elegí una garrafa'),
            quantity: z
              .number({ invalid_type_error: 'Ingresá la cantidad' })
              .int('Tiene que ser un número entero')
              .min(1, 'Mínimo 1 unidad'),
          }),
        )
        .min(1, 'El pedido necesita al menos un renglón'),
    })
    .superRefine((values, ctx) => {
      const seen = new Set<string>();
      values.items.forEach((item, index) => {
        if (!item.gasCylinderId) return;
        if (seen.has(item.gasCylinderId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['items', index, 'gasCylinderId'],
            message: 'Esta garrafa ya está en otro renglón: sumá las cantidades en uno solo',
          });
        }
        seen.add(item.gasCylinderId);
      });
      const today = argentinaDay(new Date());
      const dateChanged = Boolean(values.scheduledDate) && values.scheduledDate !== initialScheduledDate;
      const slotChanged = values.timeSlotId !== '' && values.timeSlotId !== 'none';
      if (dateChanged && values.scheduledDate < today) {
        ctx.addIssue({
          code: 'custom',
          path: ['scheduledDate'],
          message: 'scheduledDate no puede ser una fecha pasada',
        });
      } else if (
        slotChanged &&
        (values.scheduledDate || initialScheduledDate) < today &&
        (values.scheduledDate || initialScheduledDate)
      ) {
        // Cambiar la franja valida la fecha contra hoy: con la fecha ya vencida hay que indicar una nueva.
        ctx.addIssue({
          code: 'custom',
          path: ['scheduledDate'],
          message: 'La fecha agendada del pedido ya pasó: indicá una fecha nueva para cambiar la franja',
        });
      }
    });
