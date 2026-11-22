import { CircleUser, MapPin, Truck } from 'lucide-react';
import { Card, CardHeader, PersonAvatar, PhotoThumb } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';

/** Cliente, entrega y chofer de un pedido (el pago está en el resumen de ítems): la "tarjeta lateral" de la ficha. */
export const OrderPartiesCard = ({ order }: { order: Order }) => (
  <Card className="divide-y divide-dashed divide-outline">
    <section className="p-4">
      <CardHeader title="Cliente" icon={<CircleUser strokeWidth={1.8} />} as="h3" className="mb-3" />
      {order.customer ? (
        <>
          <div className="flex items-center gap-2">
            <PersonAvatar
              name={order.customer.full_name ?? 'Cliente'}
              userId={order.customer.user_id}
              size="sm"
              decorative
            />
            <p className="font-medium text-ink">{order.customer.full_name ?? 'Sin nombre'}</p>
          </div>
          {order.customer.phone_number && <p className="text-sm text-muted">{order.customer.phone_number}</p>}
          {order.customer.email && <p className="truncate text-sm text-muted">{order.customer.email}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">Sin datos del cliente</p>
      )}
    </section>

    <section className="p-4">
      <CardHeader title="Entrega" icon={<MapPin strokeWidth={1.8} />} as="h3" className="mb-3" />
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
      <CardHeader title="Chofer asignado" icon={<Truck strokeWidth={1.8} />} as="h3" className="mb-3" />
      {order.delivery_name ? (
        <>
          <div className="flex items-center gap-2">
            <PersonAvatar name={order.delivery_name} deliveryId={order.delivery_id} size="sm" decorative />
            <p className="font-medium text-ink">{order.delivery_name}</p>
          </div>
          {order.vehicle ? (
            <div className="mt-1 flex items-center gap-2">
              <PhotoThumb
                kind="car"
                id={order.vehicle.car_id}
                url={order.vehicle.photoUrl}
                size="lg"
                shape="square"
                fallback={null}
              />
              <p className="min-w-0 text-sm text-muted">
                <span className="font-mono font-semibold uppercase tracking-wide">
                  {order.vehicle.patent ?? 's/patente'}
                </span>
                {' · '}
                {[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(' ') || 'Sin marca/modelo'}
              </p>
            </div>
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
