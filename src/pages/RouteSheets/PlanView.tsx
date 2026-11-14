import { ClipboardList, Package, Route as RouteIcon, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, KpiCard } from '../../common/components/ui';
import type { RoutePlanDay } from '../../services/api/types';
import { formatDateTime } from '../../utils/format';
import { formatKm } from './routeSheetLabels';
import { DissolvedSheets } from './DissolvedSheets';
import { ResourcesCard } from './ResourcesCard';
import { SheetCard } from './SheetCard';
import { StopTargetModal, type StopTarget } from './StopTargetModal';
import { UnassignedList } from './UnassignedList';

interface Props {
  day: RoutePlanDay;
  canWrite: boolean;
  onOpen: (sheetId: string) => void;
}

/** El día de un vistazo: lo que propuso el sistema, lo que quedó afuera y con qué choferes y vehículos se cuenta. */
export const PlanView = ({ day, canWrite, onOpen }: Props) => {
  const [target, setTarget] = useState<StopTarget | null>(null);
  const { plan, sheets, unassigned } = day;
  const inSheets = sheets.reduce((sum, s) => sum + s.stops.length, 0);
  const km = sheets.reduce((sum, s) => sum + s.totals.distanceKm, 0);
  const units = sheets.reduce((sum, s) => sum + s.totals.units, 0);
  const confirmed = sheets.filter((s) => s.status !== 'draft').length;
  const blocked = unassigned.filter((o) => o.blockedReason).length;

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl border border-outline-soft bg-surface-sunken px-3.5 py-2.5 text-[13px] text-ink-2">
        <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        El sistema arma las hojas agrupando los pedidos programados por zona, franja horaria y capacidad del vehículo, y
        ordena las paradas para recorrer menos kilómetros. Vos revisás, movés lo que haga falta y confirmás.
      </p>
      <p className="text-xs text-muted">
        Cierre de la planificación: {formatDateTime(plan.cutoffAt)}
        {plan.proposedAt && ` · última propuesta: ${formatDateTime(plan.proposedAt)}`}
        {plan.closedAt && ` · cerrado: ${formatDateTime(plan.closedAt)}`}
      </p>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Pedidos programados"
          icon={ClipboardList}
          value={String(inSheets + unassigned.length)}
          hint={`${inSheets} en hojas · ${unassigned.length} sin asignar`}
        />
        <KpiCard title="Hojas" icon={RouteIcon} value={String(sheets.length)} hint={`${confirmed} confirmadas`} />
        <KpiCard title="Kilómetros estimados" icon={RouteIcon} value={formatKm(km)} hint="con regreso al depósito" />
        <KpiCard
          title="Garrafas a repartir"
          icon={Package}
          value={String(units)}
          hint={blocked ? `${blocked} pedido(s) sin poder ir en una hoja` : 'en las hojas del día'}
          pill={blocked ? { text: 'Revisar sin asignar', trend: 'warn' } : undefined}
        />
      </div>
      {sheets.length === 0 ? (
        <div className="rounded-card border border-dashed border-outline p-6">
          <EmptyState
            icon={RouteIcon}
            title="Todavía no hay hojas para este día"
            description="Usá «Proponer» para que el sistema las arme con los pedidos programados, o creá una a mano desde «Nueva hoja»."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sheets.map((sheet) => (
            <SheetCard key={sheet.id} sheet={sheet} onOpen={() => onOpen(sheet.id)} />
          ))}
        </div>
      )}
      <UnassignedList day={day} canWrite={canWrite} onPlace={setTarget} />
      {plan.summary && plan.summary.unassigned > 0 && unassigned.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
          La última propuesta dejó {plan.summary.unassigned} pedido(s) afuera; ya se resolvieron.
        </p>
      )}
      <ResourcesCard resources={day.resources} sheets={sheets} />
      <DissolvedSheets date={plan.date} />
      {target && <StopTargetModal day={day} target={target} onClose={() => setTarget(null)} />}
    </div>
  );
};
