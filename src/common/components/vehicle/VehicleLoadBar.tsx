import type { LiveVehicleLoad } from '../../../services/api/types';
import { cx } from '../ui';
import { VehiclePhoto } from './VehiclePhoto';
import { loadText, loadTone } from './vehicleLabels';

type Load = Pick<
  LiveVehicleLoad,
  'unitsOnBoard' | 'capacityUnits' | 'percent' | 'fullUnits' | 'emptyUnits' | 'defectiveUnits'
>;

interface Props {
  load: Load;
  /** Con el vehículo, la carga va sobre su foto (detalle); sin él, sola (tarjeta). */
  vehicle?: { carId: string; photoUrl: string | null | undefined; typeCar?: string | null };
  className?: string;
}

/** Los tres tipos de envase a bordo, cada uno con su color de la marca. */
const KINDS = [
  { key: 'full', label: 'Llenas', unit: ['llena', 'llenas'], color: 'bg-primary', units: (l: Load) => l.fullUnits },
  { key: 'empty', label: 'Vacías', unit: ['vacía', 'vacías'], color: 'bg-accent', units: (l: Load) => l.emptyUnits },
  {
    key: 'defective',
    label: 'Defectuosas',
    unit: ['defectuosa', 'defectuosas'],
    color: 'bg-danger',
    units: (l: Load) => l.defectiveUnits,
  },
] as const;

const TEXT = { warn: 'text-warn', danger: 'text-danger' } as const;
const toneText = (percent: number | null): string | undefined => {
  const tone = loadTone(percent);
  return tone === 'warn' || tone === 'danger' ? TEXT[tone] : undefined;
};

/** «20 llenas, 12 vacías, 1 defectuosa». */
const spoken = (load: Load) =>
  KINDS.map((kind) => `${kind.units(load)} ${kind.unit[kind.units(load) === 1 ? 0 : 1]}`).join(', ');

/**
 * La barra en tres tramos (llenas, vacías, defectuosas) sobre la capacidad del vehículo. Cada tramo mide lo que ocupa
 * de la capacidad; si lleva más de lo que entra, los tramos se reparten el 100 % y la barra no se desborda.
 */
const SegmentedBar = ({ load, capacity, tall }: { load: Load; capacity: number; tall: boolean }) => {
  const scale = Math.max(capacity, load.unitsOnBoard, 1);
  return (
    <div
      role="meter"
      aria-label="Carga del vehículo"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, load.percent ?? 0)}
      aria-valuetext={`${loadText(load)}, ${load.percent} %: ${spoken(load)}`}
      className={cx('flex overflow-hidden rounded-full bg-surface-muted', tall ? 'h-2.5' : 'h-1.5')}
    >
      {KINDS.map((kind) => (
        <span
          key={kind.key}
          aria-hidden="true"
          data-testid={`vehicle-load-${kind.key}`}
          className={cx('h-full', kind.color)}
          style={{ width: `${(kind.units(load) * 100) / scale}%` }}
        />
      ))}
    </div>
  );
};

/** Las tres cantidades con su color: lo que la barra muestra, dicho con números. */
const Legend = ({ load, compact }: { load: Load; compact: boolean }) => (
  <ul
    aria-label="Envases a bordo"
    className={cx('flex flex-wrap gap-x-3 gap-y-1', compact ? 'text-[11px]' : 'text-xs')}
  >
    {KINDS.map((kind) => (
      <li key={kind.key} className="inline-flex items-center gap-1.5 text-muted">
        <span aria-hidden="true" className={cx('h-2 w-2 shrink-0 rounded-full', kind.color)} />
        {kind.label}
        <b className="font-semibold tabular-nums text-ink">{kind.units(load)}</b>
      </li>
    ))}
  </ul>
);

/**
 * Qué lleva el vehículo: llenas, vacías y defectuosas por separado, y el total a bordo sobre las garrafas que entran.
 * El porcentaje lo calcula el back. En el detalle va sobre la foto real del vehículo. Sin capacidad cargada no hay
 * barra ni porcentaje: se muestran igual las tres cantidades.
 */
export const VehicleLoadBar = ({ load, vehicle, className }: Props) => {
  const { percent, capacityUnits } = load;
  const hasBar = percent !== null && capacityUnits !== null;
  const text = loadText(load);
  const tone = toneText(percent);

  if (!vehicle) {
    return (
      <div className={cx('grid gap-1.5 text-xs text-muted', className)}>
        <div className="flex justify-between gap-2">
          <span>Carga</span>
          <span className={cx('tabular-nums', tone ? `font-semibold ${tone}` : 'text-ink-2')}>
            {text}
            {hasBar && ` · ${percent} %`}
          </span>
        </div>
        {hasBar && <SegmentedBar load={load} capacity={capacityUnits} tall={false} />}
        <Legend load={load} compact />
      </div>
    );
  }

  return (
    <div className={cx('grid gap-3', className)}>
      <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-outline-soft">
        <VehiclePhoto carId={vehicle.carId} url={vehicle.photoUrl} typeCar={vehicle.typeCar} />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-tinta-950/85 to-transparent px-4 pb-3 pt-10">
          {hasBar && (
            <span
              className="text-3xl font-bold tabular-nums leading-none text-white"
              data-testid="vehicle-load-percent"
            >
              {percent} %
            </span>
          )}
          <span className="ml-auto text-right text-xs font-medium text-white" data-testid="vehicle-load-total">
            {text}
          </span>
        </div>
      </div>
      {hasBar && <SegmentedBar load={load} capacity={capacityUnits} tall />}
      <Legend load={load} compact={false} />
      {!hasBar && (
        <p className="text-xs text-muted">
          El vehículo no tiene cargada la cantidad de garrafas que entran: no se puede calcular el porcentaje.
        </p>
      )}
      {hasBar && percent > 100 && <p className="text-xs text-danger">Lleva más envases de los que entran.</p>}
    </div>
  );
};
