import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { toIsoDay } from '../../../utils/dates';
import {
  RANGE_PRESETS,
  dateRangeLabel,
  dateRangeSummary,
  isValidDay,
  matchPreset,
  parseDay,
  presetRange,
  type DayRange,
  type RangePresetId,
} from '../../../utils/dateRange';
import { formatDay } from '../../../utils/format';
import { Button } from './Button';
import { cx } from './cx';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const monthFormat = new Intl.DateTimeFormat('es-AR', { month: 'long' });
const monthName = (month: Date) =>
  `${monthFormat.format(month).replace(/^./, (c) => c.toUpperCase())} ${month.getFullYear()}`;

/** Las 42 celdas (6 semanas, lunes primero) del mes que contiene a `month`. */
const monthCells = (month: Date): string[] => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) =>
    toIsoDay(new Date(first.getFullYear(), first.getMonth(), 1 - offset + i)),
  );
};

interface Props {
  /**
   * `null` = sin período elegido (filtros opcionales): el botón dice `emptyLabel` y el panel arranca en el mes actual.
   * Con `openEnds` puede venir con un solo extremo (el otro vacío). Una fecha inválida se trata como vacía.
   */
  value: DayRange | null;
  /** Recibe el atajo elegido (o `null` si el rango es personalizado) para poder guardarlo junto al rango. */
  onChange: (range: DayRange, preset: RangePresetId | null) => void;
  /** El atajo elegido; sin él se deduce de las fechas (con fechas que coinciden entre atajos, mostraría otro). */
  preset?: RangePresetId | null;
  /** Último día elegible (por defecto, hoy: no hay reportes del futuro). */
  maxDay?: string;
  label?: string;
  /** Con esto el panel ofrece «Quitar período», que vuelve a no filtrar por fecha. */
  onClear?: () => void;
  /** Texto del botón cuando no hay período. */
  emptyLabel?: string;
  /** De qué lado del botón se abre el panel: por defecto `auto` (a la derecha si no entra, a la izquierda si no). */
  align?: 'left' | 'right' | 'auto';
  /** Permite rangos abiertos (sólo desde / sólo hasta) y quitar un extremo. */
  openEnds?: boolean;
  disabled?: boolean;
  /** Un solo día: sin atajos, un clic en el calendario aplica y cierra (`from` y `to` iguales). */
  single?: boolean;
}

/**
 * Selector de rango de fechas: atajos (hoy, 7 días, este mes…) y un calendario para el
 * rango personalizado. Los atajos aplican al instante; el calendario con "Aplicar".
 */
export const DateRangePicker = ({
  value,
  onChange,
  preset,
  maxDay = toIsoDay(new Date()),
  label = 'Período',
  onClear,
  emptyLabel = 'Elegir fechas',
  align = 'auto',
  openEnds = false,
  disabled = false,
  single = false,
}: Props) => {
  const clean = (day: string | undefined) => (day && isValidDay(day) ? day : '');
  const current = value ? { from: clean(value.from), to: clean(value.to) } : null;
  const effective = current && (current.from || current.to) ? current : null;
  const partial = Boolean(effective && (!effective.from || !effective.to));
  // El calendario y los atajos trabajan con un rango completo; un extremo faltante se completa sólo para mostrarlo.
  const range: DayRange = effective
    ? { from: effective.from || effective.to, to: effective.to || effective.from }
    : presetRange('today');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayRange>(effective ?? range);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [month, setMonth] = useState(() => parseDay(range.to));
  const [side, setSide] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const shown = preset === undefined ? matchPreset(range) : preset;
  const activePreset = !effective
    ? null
    : draft.from === effective.from && draft.to === effective.to
      ? partial
        ? null
        : shown
      : matchPreset(draft);
  const triggerText = !effective
    ? emptyLabel
    : partial
      ? effective.from
        ? `Desde ${formatDay(effective.from)}`
        : `Hasta ${formatDay(effective.to)}`
      : dateRangeLabel(range, shown);

  const openPanel = () => {
    setDraft(effective ?? range);
    setAnchor(null);
    setMonth(parseDay(range.to));
    setSide(align === 'right' ? 'right' : 'left');
    setOpen(true);
  };
  /** Cierra el panel y devuelve el foco al botón que lo abrió (si no, el foco se pierde en el body). */
  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Con `auto`, si el panel no entra a la derecha del botón se abre hacia la izquierda.
  useLayoutEffect(() => {
    if (!open || align !== 'auto' || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    if (side === 'left' && rect.right > window.innerWidth - 8) setSide('right');
  }, [open, align, side]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pickPreset = (id: RangePresetId) => {
    onChange(presetRange(id), id);
    closePanel();
  };

  const pickDay = (day: string) => {
    if (single) {
      onChange({ from: day, to: day }, null);
      closePanel();
      return;
    }
    if (anchor === null) {
      setAnchor(day);
      setDraft({ from: day, to: day });
      return;
    }
    setDraft(day < anchor ? { from: day, to: anchor } : { from: anchor, to: day });
    setAnchor(null);
  };

  const apply = () => {
    onChange(draft, draft.from && draft.to ? matchPreset(draft) : null);
    closePanel();
  };
  const applyOpen = (next: DayRange) => {
    onChange(next, null);
    closePanel();
  };

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${label}: ${effective ? (partial ? triggerText : dateRangeSummary(range, shown)) : 'sin elegir'}`}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="flex h-[38px] w-full items-center gap-2 rounded-[10px] border border-outline bg-surface px-3 text-[13px] font-medium text-ink shadow-control transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto"
      >
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} />
        <span className="truncate">{triggerText}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Elegir período"
          className={cx(
            'absolute top-full z-30 mt-2 flex w-[min(21.5rem,calc(100vw-4rem))] flex-col gap-3 rounded-card border border-outline bg-surface p-3 shadow-card',
            !single && 'sm:w-[30rem] sm:flex-row',
            side === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {!single && (
            <ul className="flex flex-wrap gap-1.5 sm:w-36 sm:shrink-0 sm:flex-col sm:gap-0.5" aria-label="Atajos">
              {RANGE_PRESETS.map((preset) => (
                <li key={preset.id}>
                  <button
                    type="button"
                    aria-pressed={activePreset === preset.id}
                    onClick={() => pickPreset(preset.id)}
                    className={cx(
                      'w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors',
                      activePreset === preset.id
                        ? 'bg-primary-soft text-primary-strong'
                        : 'text-ink-2 hover:bg-surface-muted hover:text-ink',
                    )}
                  >
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => shiftMonth(-1)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <p aria-live="polite" className="text-[13px] font-semibold text-ink">
                {monthName(month)}
              </p>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => shiftMonth(1)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
              {WEEKDAYS.map((d, i) => (
                <span key={i} aria-hidden="true" className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells(month).map((day) => {
                const inMonth = parseDay(day).getMonth() === month.getMonth();
                const isStart = day === draft.from;
                const isEnd = day === draft.to;
                const inRange = day > draft.from && day < draft.to;
                const disabled = day > maxDay;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    aria-label={formatDay(day)}
                    aria-pressed={isStart || isEnd}
                    onClick={() => pickDay(day)}
                    className={cx(
                      'h-8 text-[12.5px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                      inRange && 'bg-primary-soft text-primary-strong',
                      (isStart || isEnd) && 'bg-primary font-semibold text-on-primary',
                      isStart && 'rounded-l-lg',
                      isEnd && 'rounded-r-lg',
                      !inRange && !isStart && !isEnd && 'rounded-lg hover:bg-surface-muted',
                      !inRange && !isStart && !isEnd && (inMonth ? 'text-ink' : 'text-muted'),
                    )}
                  >
                    {parseDay(day).getDate()}
                  </button>
                );
              })}
            </div>
            {openEnds && !single && (anchor || (effective && !partial)) && (
              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-outline pt-3">
                {anchor ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => applyOpen({ from: anchor, to: '' })}>
                      Sólo desde este día
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => applyOpen({ from: '', to: anchor })}>
                      Sólo hasta este día
                    </Button>
                  </>
                ) : (
                  effective && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => applyOpen({ from: '', to: effective.to })}>
                        Quitar el inicio
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => applyOpen({ from: effective.from, to: '' })}>
                        Quitar el fin
                      </Button>
                    </>
                  )
                )}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline pt-3">
              <p className="min-w-0 truncate text-[12px] text-muted">
                {single
                  ? 'Elegí el día'
                  : anchor
                    ? 'Elegí el último día'
                    : draft.from && draft.to
                      ? dateRangeSummary(draft)
                      : draft.from
                        ? `Desde ${formatDay(draft.from)}`
                        : `Hasta ${formatDay(draft.to)}`}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {onClear && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClear();
                      closePanel();
                    }}
                  >
                    Quitar
                  </Button>
                )}
                {!single && (
                  <Button size="sm" onClick={apply}>
                    Aplicar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
