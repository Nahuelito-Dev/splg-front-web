import type { QuoteOrderBody } from '../../../services/api/types';
import type { NewOrderValues } from './newOrderSchema';
import { parseDeposit } from './reservationBody';

type QuoteValues = Partial<NewOrderValues>;
type Items = NonNullable<QuoteValues['items']>;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isComplete = (item: Items[number] | undefined): boolean =>
  Boolean(item?.gasCylinderId) && Number.isInteger(Number(item?.quantity)) && Number(item?.quantity) >= 1;

/**
 * Qué le falta al alta telefónica para poder cotizar, dicho para quien la carga; `null` si ya alcanza. El back
 * rechazaría un pedido a medias.
 */
export const quoteHint = (values: QuoteValues): string | null => {
  if (!values.customerId) return 'Elegí un cliente para ver el total.';
  if (!values.addressId) return 'Elegí la dirección de entrega para ver el total.';
  if (!values.items || values.items.length === 0) return 'Agregá al menos un ítem para ver el total.';
  if (!values.items.every(isComplete)) return 'Completá la garrafa y la cantidad (entera, mínimo 1) de cada ítem.';
  if (values.isReservation && !DAY.test(values.scheduledDate ?? ''))
    return 'Elegí la fecha de entrega para ver el total.';
  return null;
};

/**
 * El cuerpo de `POST /orders/quote` con lo cargado, o `null` si todavía no alcanza (ver `quoteHint`). El precio
 * unitario viaja pero no decide nada: el back cobra siempre el de catálogo con la promoción por volumen.
 */
export const buildQuoteBody = (values: QuoteValues): QuoteOrderBody | null => {
  const { customerId, addressId, items, paymentMethod, deliveryMode } = values;
  if (quoteHint(values) !== null || !customerId || !addressId || !items || !paymentMethod) return null;
  const deposit = parseDeposit(values.depositAmount);
  return {
    ...(values.isReservation
      ? {
          isReservation: true,
          scheduledDate: values.scheduledDate,
          ...(values.timeSlotId ? { timeSlotId: values.timeSlotId } : {}),
          ...(Number.isFinite(deposit) && deposit >= 0 ? { depositAmount: deposit } : {}),
        }
      : {}),
    customerId,
    addressId,
    paymentMethod,
    deliveryMode: deliveryMode ?? 'standard',
    items: items.map((item) => ({
      gasCylinderId: item.gasCylinderId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice) || 0,
    })),
  };
};
