import { useCallback, useEffect, useRef, useState } from 'react';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useSocketContext } from '../../context/SocketContext';
import { TrackingMap } from './components/TrackingMap';
import { TrackingList } from './components/TrackingList';
import { DriverLocationPayload, TrackedOrder } from './types';

// Evento que emite el backend por cada pedido en curso cuyo chofer manda su
// GPS. Un pedido = una entrada en el Map; llegar de nuevo con el mismo
// orderId actualiza (mueve) su posición en vez de acumular.
const DRIVER_LOCATION_EVENT = 'order:driver-location';

export const Tracking = () => {
  const { isOnline, subscribe } = useSocketContext();
  const [trackedOrders, setTrackedOrders] = useState<
    Map<string, TrackedOrder>
  >(new Map());
  const [focusPoint, setFocusPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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

  useEffect(() => {
    const unsubscribe = subscribe<DriverLocationPayload>(
      DRIVER_LOCATION_EVENT,
      handleLocation,
    );
    return unsubscribe;
  }, [subscribe, handleLocation]);

  const trackedOrdersList = Array.from(trackedOrders.values()).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <MyLocationIcon fontSize="large" className="text-slate-400" />
            Tracking en vivo
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Ubicación en tiempo real de los choferes con entregas en curso.{' '}
            {isOnline ? (
              <span className="text-emerald-600 font-semibold">
                Conectado
              </span>
            ) : (
              <span className="text-rose-500 font-semibold">
                Sin conexión en tiempo real
              </span>
            )}
          </p>
        </header>

        <section className="flex flex-col lg:flex-row gap-4">
          <div
            className="w-full lg:w-2/3 rounded-2xl overflow-hidden shadow-sm border border-slate-200"
            style={{ height: '70vh' }}
          >
            <TrackingMap
              trackedOrders={trackedOrdersList}
              focusPoint={focusPoint}
            />
          </div>

          <div
            className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200"
            style={{ height: '70vh' }}
          >
            <TrackingList trackedOrders={trackedOrdersList} />
          </div>
        </section>
      </div>
    </div>
  );
};
