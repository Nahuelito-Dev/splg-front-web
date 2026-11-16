import { useEffect, useState } from 'react';
import { Badge, EmptyState, PersonAvatar } from '../../../common/components/ui';
import { formatElapsed, formatShortId } from '../../../utils/format';
import type { TrackedOrder } from '../types';

interface Props {
  trackedOrders: TrackedOrder[];
}

export const TrackingList = ({ trackedOrders }: Props) => {
  // Reloj propio para que "hace Xs" se actualice aunque no llegue un evento.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (trackedOrders.length === 0) {
    return (
      <EmptyState
        title="No hay entregas en curso"
        description="Cuando un chofer con un pedido asignado empiece a mandar su ubicación, va a aparecer acá y en el mapa."
      />
    );
  }

  return (
    <ul className="h-full divide-y divide-outline overflow-y-auto" aria-label="Entregas en curso">
      {trackedOrders.map((order) => (
        <li key={order.orderId} className="px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Pedido {formatShortId(order.orderId)}</p>
            <Badge label={{ text: formatElapsed(order.at, now), tone: 'success' }} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <PersonAvatar
              name={`Chofer ${formatShortId(order.driverId)}`}
              userId={order.driverId}
              size="xs"
              decorative
            />
            Chofer {formatShortId(order.driverId)}
          </p>
          <p className="text-xs tabular-nums text-muted">
            {order.lat.toFixed(5)}, {order.lng.toFixed(5)}
          </p>
        </li>
      ))}
    </ul>
  );
};
