import type { Tone } from '../../../utils/statusLabels';
import { shareOf } from './analyticShare';
import { Card } from './Card';
import { cx } from './cx';
import { TONE_TEXT } from './toneClasses';

export interface AnalyticItem {
  key: string;
  label: string;
  /** `null`: todavía no hay dato (se muestra un guion y el anillo vacío). */
  count: number | null;
  /** Monto ya formateado, si el estado lo tiene. */
  amount?: string;
  tone: Tone;
}

interface Props {
  items: AnalyticItem[];
  /** Nombre del resumen para los lectores de pantalla. */
  label: string;
  /** Si se pasa, cada estado es un botón que filtra el listado. */
  onSelect?: (key: string) => void;
  selected?: string;
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Ring = ({ share, tone }: { share: number; tone: Tone }) => (
  <svg
    viewBox="0 0 44 44"
    aria-hidden="true"
    className={cx('h-9 w-9 shrink-0 -rotate-90 sm:h-11 sm:w-11', TONE_TEXT[tone])}
  >
    <circle cx="22" cy="22" r={RADIUS} fill="none" strokeWidth="4" className="stroke-surface-muted" />
    <circle
      cx="22"
      cy="22"
      r={RADIUS}
      fill="none"
      strokeWidth="4"
      strokeLinecap="round"
      stroke="currentColor"
      strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
    />
  </svg>
);

/**
 * Resumen por estado sobre un listado (modelo de `invoice-analytic` de Minimal): un anillo con la
 * porción de cada estado, su cantidad y, cuando aplica, su monto. En el celular va en una grilla de
 * dos columnas (el último suelto ocupa la fila), así nunca se desborda; desde `sm`, en una fila.
 */
export const AnalyticSummary = ({ items, label, onSelect, selected }: Props) => {
  const total = items.reduce((acc, item) => acc + (item.count ?? 0), 0);
  return (
    <Card className="mb-4 overflow-hidden">
      <ul
        aria-label={label}
        className={cx(
          'grid grid-cols-2 gap-px bg-outline-soft max-sm:[&>li:last-child:nth-child(odd)]:col-span-2',
          'sm:flex sm:gap-0 sm:divide-x sm:divide-outline-soft sm:bg-transparent',
        )}
      >
        {items.map((item) => {
          const body = (
            <>
              <Ring share={shareOf(item.count, total)} tone={item.tone} />
              <span className="min-w-0 text-left">
                <span className="block truncate text-[12.5px] text-muted" title={item.label}>
                  {item.label}
                </span>
                <span
                  className={cx(
                    'block text-lg font-semibold leading-tight tabular-nums',
                    item.count === 0 ? 'text-muted' : 'text-ink',
                  )}
                >
                  {item.count === null ? '–' : item.count}
                </span>
                {item.amount && <span className="block truncate text-xs tabular-nums text-muted">{item.amount}</span>}
              </span>
            </>
          );
          const active = selected === item.key;
          return (
            <li key={item.key} className="min-w-0 flex-1 bg-surface">
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(item.key)}
                  className={cx(
                    'flex h-full w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-hover sm:px-5 sm:py-4',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                    active && 'bg-surface-hover',
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className="flex h-full items-center gap-3 px-3 py-3 sm:px-5 sm:py-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
