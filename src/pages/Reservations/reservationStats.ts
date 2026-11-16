import type { Reserva } from '../../services/api/types';
import { canConfirmDeposit } from './components/reservationBalance';

/** Señas en efectivo o por transferencia que todavía nadie confirmó: son las que requieren confirmación manual. */
export const countPendingManualDeposits = (reservations: Reserva[]) => reservations.filter(canConfirmDeposit).length;
