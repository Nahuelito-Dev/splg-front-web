import { cx } from './cx';

export type TableroBarTone = 'primary' | 'info' | 'success' | 'warn' | 'danger' | 'neutral';

const BAR: Record<TableroBarTone, string> = {
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-faint',
};

export interface TableroBarItem {
  id: string;
  label: string;
  /** Lo que mide la barra. */
  value: number;
  /** El valor ya formateado (cantidad, moneda). */
  valueLabel: string;
  hint?: string;
  tone?: TableroBarTone;
}

interface Props {
  items: TableroBarItem[];
  /** Nombre accesible de la lista. */
  label: string;
}

/** El ancho de cada barra, de 0 a 100, relativo al mayor. Un valor positivo nunca queda invisible. */
const barPercent = (value: number, max: number): number =>
  max <= 0 || value <= 0 ? 0 : Math.max(3, Math.min(100, (value / max) * 100));

/** Barras horizontales con etiqueta y valor: reparto por zona, por método de pago… */
export const TableroBarList = ({ items, label }: Props) => {
  const max = Math.max(0, ...items.map((item) => item.value));
  return (
    <ul aria-label={label} className="grid gap-3.5">
      {items.map((item) => (
        <li key={item.id} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate font-medium text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums font-semibold text-ink">{item.valueLabel}</span>
          </div>
          <div
            role="meter"
            aria-label={item.label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={item.value}
            className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
          >
            <span
              className={cx('block h-full rounded-full', BAR[item.tone ?? 'primary'])}
              style={{ width: `${barPercent(item.value, max)}%` }}
            />
          </div>
          {item.hint && <span className="text-[11.5px] text-muted">{item.hint}</span>}
        </li>
      ))}
    </ul>
  );
};
