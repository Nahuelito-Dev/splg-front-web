import { useDissolvedRouteSheets } from '../../services/queries/routeSheets';
import { formatDateTime } from '../../utils/format';
import { closeReasonOf, driverOf, sheetTitle, vehicleOf } from './routeSheetLabels';

/** Las hojas canceladas o descartadas del día, plegadas al pie: el día sólo trae las vivas. */
export const DissolvedSheets = ({ date }: { date: string }) => {
  const { data } = useDissolvedRouteSheets(date);
  if (!data || data.total === 0) return null;
  return (
    <details className="rounded-card border border-outline-soft bg-surface-sunken px-4 py-3 text-[13px]">
      <summary className="cursor-pointer text-sm font-medium text-ink-2">Descartadas ({data.total})</summary>
      <ul className="mt-2 divide-y divide-outline-soft">
        {data.items.map((sheet) => (
          <li key={sheet.id} className="py-2">
            <span className="text-ink">{sheetTitle(sheet)}</span>
            <span className="block text-xs text-muted">
              {vehicleOf(sheet)} · {driverOf(sheet)} · {closeReasonOf(sheet)}
              {sheet.closedAt && ` · ${formatDateTime(sheet.closedAt)}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
};
