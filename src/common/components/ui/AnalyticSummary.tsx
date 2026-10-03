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
  <svg viewBox="0 0 44 44" aria-hidden="true" className={cx('h-11 w-11 shrink-0 -rotate-90', TONE_TEXT[tone])}>
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
 * porción de cada estado, su cantidad y, cuando aplica, su monto. En pantallas chicas se desliza.
 */
export const AnalyticSummary = ({ items, label, onSelect, selected }: Props) => {
  const total = items.reduce((acc, item) => acc + (item.count ?? 0), 0);
  return (
    <Card className="mb-4 overflow-x-auto">
      <ul aria-label={label} className="flex min-w-max divide-x divide-outline-soft sm:min-w-0">
        {items.map((item) => {
          const body = (
            <>
              <Ring share={shareOf(item.count, total)} tone={item.tone} />
              <span className="min-w-0 text-left">
                <span className="block text-[12.5px] text-muted">{item.label}</span>
                <span className="block font-mono text-lg font-semibold leading-tight text-ink">
                  {item.count === null ? '–' : item.count}
                </span>
                {item.amount && <span className="block text-xs text-muted">{item.amount}</span>}
              </span>
            </>
          );
          const active = selected === item.key;
          return (
            <li key={item.key} className="flex-1">
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(item.key)}
                  className={cx(
                    'flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-hover',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                    active && 'bg-surface-hover',
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-5 py-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
