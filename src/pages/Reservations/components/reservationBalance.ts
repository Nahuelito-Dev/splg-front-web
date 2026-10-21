import type { Reserva } from '../../../services/api/types';

/**
 * Lo que queda por cobrar al entregar una vez paga la seña: total menos seña, igual que el «Saldo a cobrar» de la
 * cotización del alta. `remainingBalance` del back sólo descuenta la seña ya cobrada, así que con la seña pendiente
 * mostraría el total entero.
 */
export const reservationBalance = (reservation: Pick<Reserva, 'total' | 'depositAmount'>): number =>
  reservation.total - reservation.depositAmount;

/** La franja elegida («Mañana (08:00–12:00)»), o que la reserva es sólo por día. */
export const slotLabel = (slot: Reserva['timeSlot'] | undefined): string =>
  slot ? `${slot.name} (${slot.startTime}–${slot.endTime})` : 'Sólo el día';

/** El admin confirma a mano la seña que se recibe en efectivo o por transferencia; la de MercadoPago la confirma el aviso de la pasarela. */
export const canConfirmDeposit = (reservation: Pick<Reserva, 'depositPaid' | 'paymentMethod'>): boolean =>
  !reservation.depositPaid && (reservation.paymentMethod === 'cash' || reservation.paymentMethod === 'transfer');

export const confirmDepositLabel = (reservation: Pick<Reserva, 'paymentMethod'>): string =>
  reservation.paymentMethod === 'transfer' ? 'Confirmar transferencia recibida' : 'Confirmar seña cobrada';
