import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DetailList, Drawer } from '../../../common/components/ui';
import type { Reserva } from '../../../services/api/types';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../../utils/format';
import { labelOf, PAYMENT_METHOD } from '../../../utils/statusLabels';
import { isKnownPaymentMethod } from './paymentMethod';
import { CashBoxField } from '../../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../../Orders/components/useOrderCashBoxes';
import { PaymentLink } from '../../Orders/components/PaymentLink';
import { canConfirmDeposit, confirmDepositLabel, slotLabel } from './reservationBalance';

interface Props {
  reservation: Reserva | null;
  onClose: () => void;
  onConfirmDeposit: (orderId: string, cashBoxId?: string) => void;
  confirming: boolean;
}

/** Todo lo que la API devuelve de una reserva, y la confirmación de la seña recibida en efectivo o por transferencia. */
export const ReservationDetailDrawer = ({ reservation, onClose, onConfirmDeposit, confirming }: Props) => {
  const navigate = useNavigate();
  const [cashBoxId, setCashBoxId] = useState('');
  const canConfirm = reservation ? canConfirmDeposit(reservation) : false;
  const inCash = canConfirm && reservation?.paymentMethod === 'cash';
  const cashBoxes = useOrderCashBoxes(inCash);
  if (!reservation) return null;
  const missingBox = inCash && cashBoxes.required && !cashBoxId;

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
            <Button
              onClick={() => onConfirmDeposit(reservation.id, inCash && cashBoxId ? cashBoxId : undefined)}
              loading={confirming}
              disabled={missingBox || cashBoxes.loading}
            >
              {confirmDepositLabel(reservation)}
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
            { label: 'Franja horaria', value: slotLabel(reservation.timeSlot) },
            {
              label: 'Medio de pago',
              value: isKnownPaymentMethod(reservation.paymentMethod)
                ? labelOf(PAYMENT_METHOD, reservation.paymentMethod).text
                : reservation.paymentMethod,
            },
          ]}
        />
        {inCash && (
          <CashBoxField
            boxes={cashBoxes.boxes}
            value={cashBoxId}
            onChange={setCashBoxId}
            hint="La seña recibida en efectivo entra a esta caja. Si exige sesión, tiene que estar abierta."
          />
        )}
        {canConfirm && reservation.paymentMethod === 'transfer' && (
          <p className="rounded-lg border border-outline bg-surface-hover p-3 text-xs text-muted">
            La seña entra a la caja de transferencias que elegiste en «Cajas de cobro». Sin caja elegida, queda sin
            asentar.
          </p>
        )}
        {!reservation.depositPaid && reservation.paymentMethod === 'mercadopago' && (
          <div>
            {reservation.paymentUrl ? (
              <PaymentLink url={reservation.paymentUrl} title="Enlace de pago de la seña (MercadoPago)" />
            ) : (
              <p className="rounded-lg border border-outline bg-surface-hover p-3 text-xs text-muted">
                No hay un enlace de pago vigente para la seña: se confirma sola cuando MercadoPago avisa el pago.
              </p>
            )}
          </div>
        )}
        <div className="rounded-xl border border-outline">
          <ul className="divide-y divide-outline-soft text-[13px]">
            {reservation.items.map((item, index) => (
              <li key={`${item.type ?? 'garrafa'}-${index}`} className="flex justify-between px-4 py-2.5">
                <span className="text-ink">{item.type ?? 'Garrafa'}</span>
                <span className="tabular-nums text-muted">× {item.quantity}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-3 gap-2 border-t border-outline bg-surface-sunken px-4 py-3 text-[13px]">
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="tabular-nums font-semibold text-ink">{formatCurrency(reservation.total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Seña</dt>
              <dd className="tabular-nums font-semibold text-ink">{formatCurrency(reservation.depositAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Saldo al entregar</dt>
              <dd className="tabular-nums font-semibold text-ink">
                {reservation.balanceDue === undefined || reservation.balanceDue === null
                  ? '—'
                  : formatCurrency(reservation.balanceDue)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Drawer>
  );
};
