import type { CreateOrderBody } from '../../../services/api/types';
import { formatCurrencyExact } from '../../../utils/format';
import type { NewOrderValues } from './newOrderSchema';

type ReservationBody = Pick<CreateOrderBody, 'isReservation' | 'scheduledDate' | 'timeSlotId' | 'depositAmount'>;

/** Número del campo de la seña («1.500» no: se escribe 1500 o 1500,50). */
export const parseDeposit = (text: string | undefined): number => Number((text ?? '').trim().replace(',', '.'));

/**
 * Los campos de `POST /orders` que agregan una reserva programada (CU-072); `{}` si el pedido no es reserva. La
 * franja es opcional: sin ella la reserva queda agendada sólo para el día.
 */
export const reservationBody = (values: NewOrderValues): ReservationBody => {
  if (!values.isReservation) return {};
  return {
    isReservation: true,
    scheduledDate: values.scheduledDate,
    ...(values.timeSlotId ? { timeSlotId: values.timeSlotId } : {}),
    depositAmount: parseDeposit(values.depositAmount),
  };
};

const DEPOSIT_CAP_MESSAGE = /no puede superar el total/;

/**
 * El error de la seña contra el total cotizado por el back, o `null`. Con cotización, compara la seña con el total;
 * si el back rechazó la cotización por el tope, usa su mismo mensaje (trae los dos montos).
 */
export const depositCapError = (
  values: Pick<NewOrderValues, 'isReservation' | 'depositAmount'>,
  quote: { total: number } | undefined,
  quoteError: string | null,
): string | null => {
  if (!values.isReservation) return null;
  const deposit = parseDeposit(values.depositAmount);
  if (!Number.isFinite(deposit)) return null;
  if (quote) {
    return deposit > quote.total
      ? `La seña (${formatCurrencyExact(deposit)}) no puede superar el total del pedido (${formatCurrencyExact(quote.total)})`
      : null;
  }
  return quoteError && DEPOSIT_CAP_MESSAGE.test(quoteError) ? quoteError : null;
};
