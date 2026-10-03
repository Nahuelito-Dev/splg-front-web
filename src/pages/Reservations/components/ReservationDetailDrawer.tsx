import { useNavigate } from 'react-router-dom';
import { Badge, Button, DetailList, Drawer } from '../../../common/components/ui';
import type { Reserva } from '../../../services/api/types';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../../utils/format';
import { labelOf, PAYMENT_METHOD } from '../../../utils/statusLabels';
import { isKnownPaymentMethod } from './paymentMethod';

interface Props {
  reservation: Reserva | null;
  onClose: () => void;
  onConfirmDeposit: (orderId: string) => void;
  confirming: boolean;
}

/** Todo lo que la API devuelve de una reserva, y la confirmación de la seña en efectivo. */
export const ReservationDetailDrawer = ({ reservation, onClose, onConfirmDeposit, confirming }: Props) => {
  const navigate = useNavigate();
  if (!reservation) return null;
  const canConfirm = !reservation.depositPaid && reservation.paymentMethod === 'cash';

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={`Reserva ${formatShortId(reservation.id)}`}
      description={`Creada el ${formatDateTime(reservation.createdAt)}`}
      footer={
        <>
          {!canConfirm && (
            <Badge
              label={
                reservation.depositPaid
                  ? { text: 'Seña paga', tone: 'success' }
                  : { text: 'Se cobra por MercadoPago', tone: 'info' }
              }
            />
          )}
          <Button variant="secondary" onClick={() => navigate(`/orders/${reservation.id}`)}>
            Ver pedido
          </Button>
          {canConfirm && (
            <Button onClick={() => onConfirmDeposit(reservation.id)} loading={confirming}>
              Confirmar seña cobrada
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <DetailList
          items={[
            { label: 'Cliente', value: reservation.customerName ?? 'Sin nombre' },
            { label: 'Teléfono', value: reservation.customerPhone ?? '—', mono: true },
            { label: 'Día agendado', value: formatDay(reservation.scheduledDate) },
            {
              label: 'Medio de pago',
              value: isKnownPaymentMethod(reservation.paymentMethod)
                ? labelOf(PAYMENT_METHOD, reservation.paymentMethod).text
                : reservation.paymentMethod,
            },
          ]}
        />
        <div className="rounded-xl border border-outline">
          <ul className="divide-y divide-outline-soft text-[13px]">
            {reservation.items.map((item, index) => (
              <li key={`${item.type ?? 'garrafa'}-${index}`} className="flex justify-between px-4 py-2.5">
                <span className="text-ink">{item.type ?? 'Garrafa'}</span>
                <span className="font-mono text-muted">× {item.quantity}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-3 gap-2 border-t border-outline bg-surface-sunken px-4 py-3 text-[13px]">
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="font-mono font-semibold text-ink">{formatCurrency(reservation.total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Seña</dt>
              <dd className="font-mono font-semibold text-ink">{formatCurrency(reservation.depositAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Saldo al entregar</dt>
              <dd className="font-mono font-semibold text-ink">{formatCurrency(reservation.remainingBalance)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Drawer>
  );
};
