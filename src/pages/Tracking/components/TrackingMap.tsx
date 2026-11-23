import { Polyline } from '@vis.gl/react-google-maps';
import { useMemo, useState } from 'react';
import { DriverPin } from '../../../common/components/map/DriverPin';
import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import { dashedLine, type LatLng } from '../../../common/components/map/latLng';
import { MapCanvas } from '../../../common/components/map/MapCanvas';
import { StopPin, type StopTone } from '../../../common/components/map/StopPin';
import { PersonAvatar, cx } from '../../../common/components/ui';
import { clockTime, vehicleName } from '../../../common/components/vehicle/vehicleLabels';
import { usePermiso } from '../../../hooks';
import type { LiveVehicle, LiveVehicleStop } from '../../../services/api/types';
import { useRouteSheetPath } from '../../../services/queries/routeSheets';
import { useMapTheme } from '../../../theme/mapTheme';
import { formatShortId } from '../../../utils/format';
import type { TrackedOrder } from '../types';

interface Props {
  vehicles: LiveVehicle[];
  selectedCarId: string | null;
  onSelectVehicle: (carId: string) => void;
  selectedStopId?: string | null;
  onSelectStop?: (orderId: string) => void;
  /** Pedidos que mandan posición sin un vehículo en uso detrás. */
  looseOrders: TrackedOrder[];
  className?: string;
}

type LocatedStop = LiveVehicleStop & { lat: number; lng: number };
const located = (stop: LiveVehicleStop): stop is LocatedStop => stop.lat !== null && stop.lng !== null;

const TONE: Record<LiveVehicleStop['progress'], StopTone> = {
  pending: 'normal',
  on_the_way: 'current',
  delivered: 'done',
  failed: 'failed',
};

/** El vehículo en su última posición, con la patente al lado; el elegido, resaltado. */
const VehiclePin = ({ patent, selected }: { patent: string | null; selected: boolean }) => (
  <span className="relative flex items-center">
    <DriverPin />
    <span
      className={cx(
        'absolute left-full ml-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase shadow-control',
        selected ? 'border-primary bg-primary text-on-primary' : 'border-outline bg-surface text-ink',
      )}
    >
      {vehicleName(patent)}
    </span>
  </span>
);

/**
 * El recorrido del vehículo elegido: por calles si tiene hoja de ruta y quien mira puede pedirlo (cuenta contra el
 * cupo diario del proveedor, por eso sólo para el elegido); si no, lo que falta unido en línea punteada.
 */
const SelectedRoute = ({ vehicle, stops }: { vehicle: LiveVehicle; stops: LocatedStop[] }) => {
  const theme = useMapTheme();
  const canPath = usePermiso('despacho.gestionar').allowed;
  const path = useRouteSheetPath(canPath ? vehicle.sheet?.id : undefined);
  const streets = path.isError ? null : path.data?.encodedPolyline || null;
  if (streets) {
    return (
      <>
        <Polyline encodedPath={streets} strokeColor={theme.halo} strokeWeight={8} strokeOpacity={0.9} zIndex={1} />
        <Polyline encodedPath={streets} strokeColor={theme.primary} strokeWeight={4} strokeOpacity={1} zIndex={2} />
      </>
    );
  }
  const ahead: LatLng[] = [
    ...(vehicle.location ? [{ lat: vehicle.location.lat, lng: vehicle.location.lng }] : []),
    ...stops
      .filter((stop) => stop.progress === 'pending' || stop.progress === 'on_the_way')
      .map(({ lat, lng }) => ({ lat, lng })),
  ];
  return ahead.length > 1 ? <Polyline path={ahead} zIndex={1} {...dashedLine(theme.primary)} /> : null;
};

/**
 * El mapa del seguimiento: cada vehículo en uso en su última posición. Al elegir uno se encuadra a él con sus paradas
 * numeradas y su recorrido. La persona puede mover el mapa: no se le vuelve a encuadrar hasta que elija otro.
 */
export const TrackingMap = ({
  vehicles,
  selectedCarId,
  onSelectVehicle,
  selectedStopId,
  onSelectStop,
  looseOrders,
  className,
}: Props) => {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const selected = vehicles.find((vehicle) => vehicle.carId === selectedCarId) ?? null;
  const stops = useMemo(() => (selected ? selected.stops.filter(located) : []), [selected]);

  const fitPoints = useMemo((): LatLng[] => {
    if (selected) {
      return [
        ...(selected.location ? [{ lat: selected.location.lat, lng: selected.location.lng }] : []),
        ...stops.map(({ lat, lng }) => ({ lat, lng })),
      ];
    }
    return [
      ...vehicles.flatMap((v) => (v.location ? [{ lat: v.location.lat, lng: v.location.lng }] : [])),
      ...looseOrders.map(({ lat, lng }) => ({ lat, lng })),
    ];
  }, [selected, stops, vehicles, looseOrders]);
  // Se encuadra cuando cambia qué hay para ver, no con cada posición nueva.
  const fitKey = selected
    ? `${selected.carId}:${Boolean(selected.location)}:${stops.map((s) => s.orderId).join(',')}`
    : [...vehicles.filter((v) => v.location).map((v) => v.carId), ...looseOrders.map((order) => order.orderId)].join(
        ',',
      );

  return (
    <MapCanvas
      label="Mapa del seguimiento en vivo"
      className={cx('h-full', className)}
      defaultZoom={12}
      gestures="greedy"
      fitPoints={fitPoints}
      fitKey={fitKey}
      fitScope={selectedCarId ?? 'all'}
      maxFitZoom={15}
    >
      {selected && <SelectedRoute vehicle={selected} stops={stops} />}
      {stops.map((stop, index) => (
        <HtmlMarker
          key={stop.orderId}
          position={stop}
          title={`${stop.sequence ?? index + 1}. ${stop.customerName ?? 'Cliente sin nombre'}`}
          onClick={onSelectStop ? () => onSelectStop(stop.orderId) : undefined}
          zIndex={stop.orderId === selectedStopId ? 20 : 10}
        >
          <StopPin
            sequence={stop.sequence ?? index + 1}
            tone={TONE[stop.progress]}
            selected={stop.orderId === selectedStopId}
          />
        </HtmlMarker>
      ))}
      {vehicles.map((vehicle) =>
        vehicle.location ? (
          <HtmlMarker
            key={vehicle.carId}
            position={vehicle.location}
            title={`${vehicleName(vehicle.patent)} · ${vehicle.driver.name ?? 'Chofer'}${
              vehicle.location.at ? ` · posición de las ${clockTime(vehicle.location.at)}` : ''
            }`}
            onClick={() => onSelectVehicle(vehicle.carId)}
            zIndex={vehicle.carId === selectedCarId ? 40 : 30}
          >
            <VehiclePin patent={vehicle.patent} selected={vehicle.carId === selectedCarId} />
          </HtmlMarker>
        ) : null,
      )}
      {looseOrders.map((order) => {
        const open = openOrderId === order.orderId;
        return (
          <HtmlMarker
            key={order.orderId}
            position={order}
            title={`Pedido ${formatShortId(order.orderId)} · chofer ${formatShortId(order.driverId)}`}
            onClick={() => setOpenOrderId(open ? null : order.orderId)}
            zIndex={open ? 25 : 15}
          >
            <DriverPin />
            {open && (
              <span
                data-testid="tracking-marker-info"
                className="absolute bottom-full left-1/2 mb-2 block w-max -translate-x-1/2 rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-left text-xs text-ink shadow-control"
              >
                <b className="block font-semibold">Pedido {formatShortId(order.orderId)}</b>
                <span className="mt-1 flex items-center gap-1.5 text-muted">
                  <PersonAvatar name="Chofer" userId={order.driverId} size="sm" decorative />
                  Chofer {formatShortId(order.driverId)}
                </span>
                <span className="block text-muted">Última actualización: {clockTime(order.at)}</span>
                <span className="block text-muted">Sin vehículo en uso</span>
              </span>
            )}
          </HtmlMarker>
        );
      })}
    </MapCanvas>
  );
};
