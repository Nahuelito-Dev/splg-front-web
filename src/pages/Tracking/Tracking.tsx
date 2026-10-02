import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Card, PageHeader, Tabs, tabPanelProps } from '../../common/components/ui';
import { useSocketContext } from '../../context/useSocketContext';
import { DRIVER_LOCATION_EVENT } from '../../hooks/useSocket';
import { AvailableOrdersPool } from './components/AvailableOrdersPool';
import { TrackingList } from './components/TrackingList';
import { TrackingMap } from './components/TrackingMap';
import { useAvailablePool } from './useAvailablePool';
import type { DriverLocationPayload, TrackedOrder } from './types';

type PanelTab = 'live' | 'pool';
const TABS_ID = 'tracking';

export const Tracking = () => {
  const { isOnline, subscribe } = useSocketContext();
  const [trackedOrders, setTrackedOrders] = useState<Map<string, TrackedOrder>>(new Map());
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [tab, setTab] = useState<PanelTab>('live');
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

  const pool = useAvailablePool(isOnline);
  // El contador sale de la misma consulta que la lista; sin datos todavía, un guion y no un 0.
  const poolCount = pool.isLoading || pool.isError ? null : pool.total;

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

        <Card className="flex w-full flex-col overflow-hidden lg:w-1/3" style={{ height: '70vh' }}>
          <Tabs
            items={[
              { id: 'live', label: 'En curso', count: trackedOrdersList.length },
              { id: 'pool', label: 'Disponibles', count: poolCount },
            ]}
            value={tab}
            onChange={(id) => setTab(id as PanelTab)}
            label="Pedidos del seguimiento"
            idPrefix={TABS_ID}
          />
          <div className="min-h-0 flex-1" {...tabPanelProps(TABS_ID, tab)}>
            {tab === 'live' ? <TrackingList trackedOrders={trackedOrdersList} /> : <AvailableOrdersPool pool={pool} />}
          </div>
        </Card>
      </section>
    </div>
  );
};
