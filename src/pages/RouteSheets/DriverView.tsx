import { Navigation, Route as RouteIcon } from 'lucide-react';
import { Button, EmptyState, cx } from '../../common/components/ui';
import type { RoutePlanDay } from '../../services/api/types';
import { formatDay } from '../../utils/format';
import { formatKm, hhmm, sheetTitle, slotOf, stopName, vehicleOf } from './routeSheetLabels';

interface Props {
  day: RoutePlanDay;
  sheetId: string;
  onPick: (sheetId: string) => void;
}

/**
 * Vista previa informativa: cómo va a ver el chofer la hoja seleccionada en su app (paradas en orden con la hora
 * estimada). Es una maqueta con los datos reales; la app del chofer la recibe cuando inicia la hoja.
 */
export const DriverView = ({ day, sheetId, onPick }: Props) => {
  const sheet = day.sheets.find((s) => s.id === sheetId);
  if (!sheet) {
    return (
      <EmptyState icon={RouteIcon} title="No hay hojas para este día" description="Elegí un día con hojas armadas." />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Hoja">
        {day.sheets.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === sheet.id ? 'primary' : 'secondary'}
            aria-pressed={s.id === sheet.id}
            onClick={() => onPick(s.id)}
          >
            {sheetTitle(s)}
          </Button>
        ))}
      </div>
      <figure className="mx-auto w-[300px] max-w-full">
        <div className="overflow-hidden rounded-[38px] border-[10px] border-tinta-800 bg-surface shadow-card">
          <div className="bg-gradient-to-br from-gas-400 to-llama-500 px-4 pb-3.5 pt-5 text-white">
            <small className="opacity-85">Hoja del {formatDay(sheet.planDate)}</small>
            <h4 className="mt-0.5 text-[17px] font-semibold">{vehicleOf(sheet)}</h4>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
              {[
                [String(sheet.stops.length), 'paradas'],
                [formatKm(sheet.totals.distanceKm), 'recorrido'],
                [String(sheet.totals.units), 'garrafas'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[10px] bg-white/20 px-2 py-1.5">
                  <b className="block truncate font-mono text-[15px]">{value}</b>
                  {label}
                </div>
              ))}
            </div>
          </div>
          {sheet.stops.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-muted">Sin paradas todavía.</p>
          ) : (
            <ol
              aria-label="Paradas en la app del chofer"
              className="flex max-h-[470px] flex-col gap-2 overflow-auto px-3 pb-3.5 pt-2"
            >
              {sheet.stops.map((stop, i) => (
                <li
                  key={stop.orderId}
                  className={cx(
                    'grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2.5 py-2 text-[12.5px]',
                    i === 0 ? 'border-primary bg-primary-soft' : 'border-outline',
                  )}
                >
                  <span
                    className={cx(
                      'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold',
                      stop.late ? 'bg-danger text-white' : 'bg-primary text-on-primary',
                    )}
                  >
                    {stop.sequence}
                  </span>
                  <div className="min-w-0">
                    <b className="block truncate font-semibold text-ink">{stopName(stop)}</b>
                    <small className="block truncate text-muted">
                      {stop.address ?? 'Sin dirección'} · {stop.units} garrafa(s) · {slotOf(stop)}
                    </small>
                  </div>
                  <b className="font-mono text-ink">{hhmm(stop.plannedEtaAt ?? stop.etaAt)}</b>
                </li>
              ))}
            </ol>
          )}
          <div className="px-3 pb-3.5">
            <Button className="w-full" icon={<Navigation className="h-4 w-4" />} disabled>
              Navegar a la parada 1
            </Button>
          </div>
        </div>
        <figcaption className="mx-auto mt-2 text-center text-xs text-muted">
          Vista previa: así ve {sheet.driverName ?? 'el chofer'} sus paradas en orden, con la hora estimada, cuando
          inicia la hoja en su app.
        </figcaption>
      </figure>
    </div>
  );
};
