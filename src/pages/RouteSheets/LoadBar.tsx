import { cx } from '../../common/components/ui';
import type { RouteSheet } from '../../services/api/types';
import { loadPercent, loadText } from './routeSheetLabels';

/** Más de esto de la capacidad del vehículo se marca en tono de advertencia. */
export const LOAD_WARN_PERCENT = 85;

/** Carga del vehículo contra su capacidad (garrafas o kg): el texto y la barra, en advertencia arriba del 85 %. */
export const LoadBar = ({ sheet, className }: { sheet: RouteSheet; className?: string }) => {
  const pct = loadPercent(sheet);
  const warn = pct !== null && pct > LOAD_WARN_PERCENT;
  return (
    <div className={cx('grid gap-1.5 text-xs text-muted', className)}>
      <div className="flex justify-between gap-2">
        <span>Carga</span>
        <span className={cx('font-mono', warn ? 'font-semibold text-warn' : 'text-ink-2')}>
          {loadText(sheet)}
          {pct !== null && ` · ${pct} %`}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Carga del vehículo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-valuetext={loadText(sheet)}
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          data-testid="load-bar-fill"
          className={cx('h-full rounded-full', warn ? 'bg-warn' : 'bg-primary')}
          style={{ width: `${Math.min(100, pct ?? 0)}%` }}
        />
      </div>
    </div>
  );
};
