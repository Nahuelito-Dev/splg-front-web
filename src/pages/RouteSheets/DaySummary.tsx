import { ClipboardList, PackageOpen, Route as RouteIcon, Waypoints } from 'lucide-react';
import { KpiCard } from '../../common/components/ui';
import type { RoutePlanDay } from '../../services/api/types';
import { useCachedRouteSheetPaths } from '../../services/queries/routeSheets';
import { formatKm } from './routeSheetLabels';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * El día de un vistazo, arriba de todas las vistas: pedidos (en hojas y sin asignar), hojas (propuestas y
 * confirmadas), kilómetros y envases a retirar. Los km son por calles cuando todas las hojas ya tienen su recorrido
 * trazado (el mapa de cada hoja lo pide); si no, el estimado del plan, con ese nombre. Los envases salen del día.
 */
export const DaySummary = ({ day }: { day: RoutePlanDay }) => {
  const { sheets, unassigned } = day;
  const routed = sheets.filter((s) => s.stops.length > 0);
  const ids = routed.map((s) => s.id);
  const paths = useCachedRouteSheetPaths(ids);

  const inSheets = sheets.reduce((sum, s) => sum + s.stops.length, 0);
  const blocked = unassigned.filter((o) => o.blockedReason).length;
  const drafts = sheets.filter((s) => s.status === 'draft').length;
  const confirmed = sheets.length - drafts;

  const byStreets = ids.length > 0 && paths.every((p) => p?.provider) ? paths : null;
  const km = byStreets
    ? byStreets.reduce((sum, p) => sum + (p?.distanceMeters ?? 0), 0) / 1000
    : sheets.reduce((sum, s) => sum + s.totals.distanceKm, 0);

  return (
    <section aria-label="Resumen del día" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Pedidos programados"
        icon={ClipboardList}
        value={String(inSheets + unassigned.length)}
        hint={`${inSheets} en hojas · ${unassigned.length} sin asignar`}
        pill={blocked ? { text: `${blocked} sin poder ir en una hoja`, trend: 'warn' } : undefined}
      />
      <KpiCard
        title="Hojas"
        icon={Waypoints}
        value={String(sheets.length)}
        hint={`${plural(drafts, 'propuesta', 'propuestas')} · ${plural(confirmed, 'confirmada', 'confirmadas')}`}
      />
      <KpiCard
        title={byStreets ? 'Kilómetros por calles' : 'Kilómetros estimados'}
        icon={RouteIcon}
        value={formatKm(km)}
        hint={byStreets ? 'recorridos trazados, con regreso al galpón' : 'del plan; por calles al abrir cada hoja'}
      />
      <KpiCard
        title="Envases a retirar"
        icon={PackageOpen}
        value={String(day.emptiesExpected)}
        hint={`vacías del canje en ${plural(routed.length, 'hoja', 'hojas')}`}
      />
    </section>
  );
};
