import type { Reserva } from '../../../services/api/types';
import { cx } from '../../../common/components/ui';
import { formatCurrency } from '../../../utils/format';

interface Props {
  reservation: Reserva;
  onOpen: (reservation: Reserva) => void;
  /** Chip de una línea (mes), con el total (semana) o con el total y el estado de la seña (día). */
  variant?: 'chip' | 'card' | 'row';
}

/** La reserva como evento del calendario: verde con la seña paga, ámbar con la seña pendiente. */
export const ReservationEvent = ({ reservation, onOpen, variant = 'card' }: Props) => {
  const name = reservation.customerName ?? 'Sin nombre';
  const state = reservation.depositPaid ? 'seña paga' : 'seña pendiente';
  return (
    <button
      type="button"
      onClick={() => onOpen(reservation)}
      aria-label={`Reserva de ${name}, ${formatCurrency(reservation.total)}, ${state}`}
      className={cx(
        'block w-full min-w-0 rounded-md border-l-[3px] px-2 text-left transition-[filter] hover:brightness-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        reservation.depositPaid ? 'border-success bg-success-soft text-success' : 'border-warn bg-warn-soft text-warn',
        variant === 'chip' ? 'py-0.5 text-[11.5px]' : 'py-1.5 text-[12.5px]',
      )}
    >
      <span className="block truncate font-semibold">{name}</span>
      {variant !== 'chip' && (
        <span className="block truncate tabular-nums text-[11.5px] opacity-90">
          {formatCurrency(reservation.total)}
          {variant === 'row' && ` · ${state}`}
        </span>
      )}
    </button>
  );
};
