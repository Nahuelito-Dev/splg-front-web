import { TriangleAlert } from 'lucide-react';
import { Badge } from '../../common/components/ui';
import type { RouteSheet } from '../../services/api/types';
import {
  SHEET_STATUS,
  driverOf,
  emptiesText,
  formatKm,
  formatMinutes,
  hhmm,
  returnAtOf,
  sheetTitle,
  vehicleOf,
} from './routeSheetLabels';
import { LoadBar } from './LoadBar';

/** Una hoja del día en la grilla: carga contra capacidad, paradas, recorrido, duración y regreso. */
export const SheetCard = ({ sheet, onOpen }: { sheet: RouteSheet; onOpen: () => void }) => {
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
      <LoadBar sheet={sheet} />
      <dl className="grid grid-cols-2 gap-2 border-t border-outline-soft pt-3 text-xs">
        <div>
          <dt className="text-muted">Paradas</dt>
          <dd className="tabular-nums text-sm font-semibold text-ink">{sheet.stops.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Recorrido</dt>
          <dd className="tabular-nums text-sm font-semibold text-ink">{formatKm(sheet.totals.distanceKm)}</dd>
        </div>
        <div>
          <dt className="text-muted">Duración</dt>
          <dd className="tabular-nums text-sm font-semibold text-ink">{formatMinutes(sheet.totals.durationMin)}</dd>
        </div>
        <div>
          <dt className="text-muted">Regreso</dt>
          <dd className="tabular-nums text-sm font-semibold text-ink">{hhmm(returnAtOf(sheet))}</dd>
        </div>
      </dl>
      {sheet.totals.emptiesExpected > 0 && (
        <p className="text-xs text-ink-2" data-testid="sheet-empties">
          {emptiesText(sheet.totals.emptiesExpected)} en la hoja
        </p>
      )}
      {sheet.warnings.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-warn">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {sheet.warnings.map((w) => w.message).join(' · ')}
        </p>
      )}
    </button>
  );
};
