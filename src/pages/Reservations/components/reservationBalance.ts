import type { Reserva } from '../../../services/api/types';

/** La franja elegida («Mañana (08:00–12:00)»), o que la reserva es sólo por día. */
export const slotLabel = (slot: Reserva['timeSlot'] | undefined): string =>
  slot ? `${slot.name} (${slot.startTime}–${slot.endTime})` : 'Sólo el día';

/**
 * El admin confirma a mano la seña que se recibe en efectivo; la de MercadoPago la confirma el aviso de la pasarela.
 * Una seña anterior por transferencia (ya no se ofrece) también se puede confirmar, sin caja: sólo para cerrar lo viejo.
 */
export const canConfirmDeposit = (reservation: Pick<Reserva, 'depositPaid' | 'paymentMethod'>): boolean =>
  !reservation.depositPaid && (reservation.paymentMethod === 'cash' || reservation.paymentMethod === 'transfer');

export const confirmDepositLabel = (reservation: Pick<Reserva, 'paymentMethod'>): string =>
  reservation.paymentMethod === 'transfer' ? 'Confirmar seña de transferencia anterior' : 'Confirmar seña cobrada';
