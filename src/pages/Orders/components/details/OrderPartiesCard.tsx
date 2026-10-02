import { CircleUser, MapPin, Truck } from 'lucide-react';
import { Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';

/** Cliente, entrega y chofer de un pedido (el pago está en el resumen de ítems): la "tarjeta lateral" de la ficha. */
export const OrderPartiesCard = ({ order }: { order: Order }) => (
  <Card className="divide-y divide-dashed divide-outline">
    <section className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <CircleUser aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /> Cliente
      </h3>
      {order.customer ? (
        <>
          <p className="font-medium text-ink">{order.customer.full_name ?? 'Sin nombre'}</p>
          {order.customer.phone_number && <p className="text-sm text-muted">{order.customer.phone_number}</p>}
          {order.customer.email && <p className="truncate text-sm text-muted">{order.customer.email}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">Sin datos del cliente</p>
      )}
    </section>

    <section className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <MapPin aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /> Entrega
      </h3>
      <p className="font-medium text-ink">{order.delivery_address?.street ?? 'Sin dirección'}</p>
      <p className="text-sm text-muted">{order.delivery_address?.city ?? '—'}</p>
      {order.delivery_window_start && order.delivery_window_end && (
        <p className="mt-2 text-xs text-muted">
          Franja horaria: {order.delivery_window_start}–{order.delivery_window_end}
        </p>
      )}
      {order.delivery_notes && (
        <p className="mt-2 rounded-lg bg-surface-hover p-2 text-xs text-muted">{order.delivery_notes}</p>
      )}
      {order.customer_notes && <p className="mt-2 text-xs text-muted">Nota del cliente: {order.customer_notes}</p>}
    </section>

    <section className="p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Truck aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /> Chofer asignado
      </h3>
      {order.delivery_name ? (
        <>
          <p className="font-medium text-ink">{order.delivery_name}</p>
          {order.vehicle ? (
            <p className="mt-1 text-sm text-muted">
              <span className="font-mono font-semibold uppercase tracking-wide">
                {order.vehicle.patent ?? 's/patente'}
              </span>
              {' · '}
              {[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(' ') || 'Sin marca/modelo'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">Sin vehículo registrado al aceptar el pedido</p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">Todavía sin asignar</p>
      )}
    </section>
  </Card>
);
