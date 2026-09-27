import { Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { formatDateTime, formatDay } from '../../../../utils/format';

/** Los tiempos del pedido tal como los devuelve la API, más el motivo si se canceló. */
export const OrderTimeline = ({ order }: { order: Order }) => {
  const entries = [
    { label: 'Creado', value: formatDateTime(order.created_at) },
    {
      label: 'Entrega solicitada',
      value: formatDateTime(order.requested_delivery_date),
    },
    // La reserva ya muestra su fecha agendada en la tarjeta de seña: acá sólo
    // para un pedido agendado que no es una pre-reserva (sin seña de por medio).
    ...(order.scheduledDate && order.status !== 'reserved'
      ? [{ label: 'Agendado para', value: formatDay(order.scheduledDate) }]
      : []),
    { label: 'Aceptado', value: formatDateTime(order.accepted_at) },
    { label: 'En camino', value: formatDateTime(order.on_the_way_at) },
    { label: 'Entregado', value: formatDateTime(order.actual_delivery_date) },
  ];

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Tiempos del pedido</h3>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {order.status === 'cancelled' && (
        <p className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          Cancelado: {order.cancellation_reason ?? 'sin motivo informado'}
        </p>
      )}
    </Card>
  );
};
