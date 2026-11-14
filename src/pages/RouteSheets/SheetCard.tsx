import { TriangleAlert } from 'lucide-react';
import { Badge, cx } from '../../common/components/ui';
import type { RouteSheet } from '../../services/api/types';
import {
  SHEET_STATUS,
  driverOf,
  formatKm,
  formatMinutes,
  hhmm,
  loadPercent,
  loadText,
  returnAtOf,
  sheetTitle,
  vehicleOf,
} from './routeSheetLabels';

/** Una hoja del día en la grilla: carga contra capacidad, paradas, recorrido, duración y regreso. */
export const SheetCard = ({ sheet, onOpen }: { sheet: RouteSheet; onOpen: () => void }) => {
  const pct = loadPercent(sheet);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid min-w-0 grid-cols-1 gap-3 rounded-card border border-outline bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{sheetTitle(sheet)}</h3>
          <p className="text-xs text-muted">
            {sheet.proposedBy === 'system' ? 'Propuesta por el sistema' : 'Armada a mano'}
            {sheet.editedAt && ' · editada'}
          </p>
        </div>
        <Badge label={SHEET_STATUS[sheet.status]} />
      </div>
      <p className="text-[12.5px] text-ink-2">
        {vehicleOf(sheet)} · {driverOf(sheet)}
      </p>
      <div className="grid gap-1.5 text-xs text-muted">
        <div className="flex justify-between gap-2">
          <span>Carga</span>
          <span className="font-mono text-ink-2">{loadText(sheet)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className={cx('h-full rounded-full', pct !== null && pct > 85 ? 'bg-warn' : 'bg-primary')}
            style={{ width: `${Math.min(100, pct ?? 0)}%` }}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 border-t border-outline-soft pt-3 text-xs">
        <div>
          <dt className="text-muted">Paradas</dt>
          <dd className="font-mono text-sm font-semibold text-ink">{sheet.stops.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Recorrido</dt>
          <dd className="font-mono text-sm font-semibold text-ink">{formatKm(sheet.totals.distanceKm)}</dd>
        </div>
        <div>
          <dt className="text-muted">Duración</dt>
          <dd className="font-mono text-sm font-semibold text-ink">{formatMinutes(sheet.totals.durationMin)}</dd>
        </div>
        <div>
          <dt className="text-muted">Regreso</dt>
          <dd className="font-mono text-sm font-semibold text-ink">{hhmm(returnAtOf(sheet))}</dd>
        </div>
      </dl>
      {sheet.warnings.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warn">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {sheet.warnings.map((w) => w.message).join(' · ')}
        </p>
      )}
    </button>
  );
};
