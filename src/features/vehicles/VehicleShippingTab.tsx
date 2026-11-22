import { Link } from 'react-router-dom';
import { Badge } from '../../common/components/ui';
import { VehicleLoadBar } from '../../common/components/vehicle/VehicleLoadBar';
import { VehicleStopsLine } from '../../common/components/vehicle/VehicleStopsLine';
import { clockTime, remainingText } from '../../common/components/vehicle/vehicleLabels';
import type { LiveVehicle } from '../../services/api/types';
import { usePhotoLink, useRenewablePhoto } from '../../services/queries/photos';
import { TRUCK_LOAD_STATUS } from '../../utils/statusLabels';

interface Props {
  vehicle: LiveVehicle;
  now: number;
  selectedStopId?: string | null;
  onSelectStop?: (orderId: string) => void;
}

const SECTION_TITLE = 'text-sm font-semibold text-ink';
const LINK = 'text-xs font-medium text-primary-strong underline-offset-2 hover:underline';

/** La foto principal de la carga, si el back tiene una; si no hay (o no se puede ver), no se dibuja nada. */
const CargoPhoto = ({ truckLoadId, number }: { truckLoadId: string; number: number | null }) => {
  const link = usePhotoLink('truckLoad', truckLoadId);
  const photo = useRenewablePhoto('truckLoad', truckLoadId, link.data?.url);
  if (!photo.src || photo.failed) return null;
  return (
    <section aria-label="Foto de la carga" className="space-y-2">
      <h3 className={SECTION_TITLE}>Foto de la carga</h3>
      <img
        src={photo.src}
        alt={number === null ? 'Foto de la carga del vehículo' : `Foto de la carga N.º ${number}`}
        loading="lazy"
        onError={photo.handleError}
        className="max-h-56 w-full rounded-xl border border-outline-soft object-cover"
      />
    </section>
  );
};

/** Pestaña «Envío»: cuánto lleva el vehículo, por dónde va y qué le falta. */
export const VehicleShippingTab = ({ vehicle, now, selectedStopId, onSelectStop }: Props) => {
  const { load, sheet, stops } = vehicle;
  const remaining = remainingText(sheet?.estimatedEndAt, now);

  return (
    <div className="space-y-6">
      <section aria-label="Capacidad de carga" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={SECTION_TITLE}>Capacidad de carga</h3>
          {load.truckLoadId && load.truckLoadStatus ? (
            <Link to={`/truck-loads/${load.truckLoadId}`} className="inline-flex items-center gap-1.5 text-xs">
              <span className={LINK}>Carga N.º {load.truckLoadNumber ?? '—'}</span>
              <Badge label={TRUCK_LOAD_STATUS[load.truckLoadStatus]} />
            </Link>
          ) : (
            <span className="text-xs text-muted">Sin carga abierta</span>
          )}
        </div>
        <VehicleLoadBar
          load={load}
          vehicle={{ carId: vehicle.carId, photoUrl: vehicle.photoUrl, typeCar: vehicle.typeCar }}
        />
      </section>

      <section aria-label="Recorrido" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className={SECTION_TITLE}>Recorrido</h3>
          {remaining && (
            <span className="text-sm font-semibold tabular-nums text-ink" data-testid="vehicle-remaining">
              {remaining}
            </span>
          )}
        </div>
        {sheet ? (
          <div className="space-y-1 text-xs text-muted">
            <p>
              Hoja de ruta{sheet.number === null ? '' : ` N.º ${sheet.number}`} ·{' '}
              {sheet.startedAt
                ? `salió ${clockTime(sheet.startedAt)}`
                : sheet.plannedStartAt
                  ? `sale ${clockTime(sheet.plannedStartAt)}`
                  : 'todavía no salió'}
              {sheet.estimatedEndAt && ` · última parada ${clockTime(sheet.estimatedEndAt)}`}
            </p>
            <p className="text-ink-2">
              {sheet.delivered} de {sheet.total} entregadas
              {sheet.failed > 0 && ` · ${sheet.failed} no entregadas`}
              {` · faltan ${sheet.pending}`}
            </p>
            <Link to={`/route-sheets?date=${sheet.planDate}&view=sheet&sheet=${sheet.id}`} className={LINK}>
              Ver hoja de ruta
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted">
            {stops.length > 0
              ? 'Pedidos en curso fuera de una hoja de ruta: no tienen hora estimada.'
              : 'Sin hoja de ruta ni pedidos en curso.'}
          </p>
        )}
        <VehicleStopsLine stops={stops} detailed selectedId={selectedStopId} onSelect={onSelectStop} />
      </section>

      {load.truckLoadId && <CargoPhoto truckLoadId={load.truckLoadId} number={load.truckLoadNumber} />}
    </div>
  );
};
