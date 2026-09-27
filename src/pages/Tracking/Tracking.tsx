import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Card, PageHeader } from '../../common/components/ui';
import { useSocketContext } from '../../context/useSocketContext';
import { DRIVER_LOCATION_EVENT } from '../../hooks/useSocket';
import { TrackingList } from './components/TrackingList';
import { TrackingMap } from './components/TrackingMap';
import type { DriverLocationPayload, TrackedOrder } from './types';

export const Tracking = () => {
  const { isOnline, subscribe } = useSocketContext();
  const [trackedOrders, setTrackedOrders] = useState<Map<string, TrackedOrder>>(new Map());
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null);
  const hasFocusedRef = useRef(false);

  const handleLocation = useCallback((payload: DriverLocationPayload) => {
    setTrackedOrders((prev) => {
      const next = new Map(prev);
      next.set(payload.orderId, payload);
      return next;
    });

    // Solo centramos el mapa la primera vez que llega una posición (de
    // cualquier pedido), para no pisarle la vista al admin después.
    if (!hasFocusedRef.current) {
      hasFocusedRef.current = true;
      setFocusPoint({ lat: payload.lat, lng: payload.lng });
    }
  }, []);

  useEffect(() => subscribe<DriverLocationPayload>(DRIVER_LOCATION_EVENT, handleLocation), [subscribe, handleLocation]);

  const trackedOrdersList = Array.from(trackedOrders.values()).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-8">
      <PageHeader
        title="Seguimiento en vivo"
        description="Ubicación en tiempo real de los choferes con entregas en curso."
        actions={
          <Badge
            label={
              isOnline
                ? { text: 'Conectado', tone: 'success' }
                : { text: 'Sin conexión en tiempo real', tone: 'danger' }
            }
          />
        }
      />

      <section className="flex flex-col gap-4 lg:flex-row">
        <Card className="w-full overflow-hidden lg:w-2/3" style={{ height: '70vh' }}>
          <TrackingMap trackedOrders={trackedOrdersList} focusPoint={focusPoint} />
        </Card>

        <Card className="w-full lg:w-1/3" style={{ height: '70vh' }}>
          <TrackingList trackedOrders={trackedOrdersList} />
        </Card>
      </section>
    </div>
  );
};
