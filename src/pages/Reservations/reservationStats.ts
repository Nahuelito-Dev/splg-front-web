import type { Reserva } from '../../services/api/types';

/** Señas en efectivo que todavía nadie cobró: son las únicas que requieren confirmación manual. */
export const countPendingCashDeposits = (reservations: Reserva[]) =>
  reservations.filter((r) => !r.depositPaid && r.paymentMethod === 'cash').length;
