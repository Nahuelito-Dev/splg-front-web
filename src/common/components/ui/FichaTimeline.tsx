import type { ReactNode } from 'react';
import type { Tone } from '../../../utils/statusLabels';
import { cx } from './cx';
import { TONE_CLASSES } from './toneClasses';

export type FichaTimelineState = 'done' | 'current' | 'pending' | 'cancelled';

export interface FichaTimelineItem {
  id: string;
  title: string;
  /** Fecha y hora ya formateadas; sin dato, el hito se muestra sin ella. */
  when?: string | null;
  /** Quién lo hizo, si se sabe. */
  actor?: string | null;
  /** Una línea de detalle (motivo, agenda…). */
  note?: ReactNode;
  state: FichaTimelineState;
  /** Tono del hito actual (el mismo de las etiquetas de estado); sin él, primario. */
  tone?: Tone;
}

const DOT: Record<FichaTimelineState, string> = {
  done: 'border-success bg-success',
  current: 'border-primary bg-primary ring-4 ring-primary/20',
  pending: 'border-outline bg-surface',
  cancelled: 'border-danger bg-danger ring-4 ring-danger/20',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'border-faint bg-faint ring-4 ring-faint/20',
  info: 'border-info bg-info ring-4 ring-info/20',
  warn: 'border-warn bg-warn ring-4 ring-warn/20',
  success: 'border-success bg-success ring-4 ring-success/20',
  danger: 'border-danger bg-danger ring-4 ring-danger/20',
  primary: 'border-primary bg-primary ring-4 ring-primary/20',
  accent: 'border-accent bg-accent ring-4 ring-accent/20',
};

const STATE_TEXT: Record<FichaTimelineState, string> = {
  done: '',
  current: 'Estado actual',
  pending: 'Pendiente',
  cancelled: 'Estado actual',
};

/** Línea de tiempo vertical: un punto por hito y el hito actual resaltado. */
export const FichaTimeline = ({ items, className }: { items: FichaTimelineItem[]; className?: string }) => (
  <ol className={cx('m-0 list-none p-0', className)}>
    {items.map((item, index) => (
      <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0" aria-current={item.state === 'current'}>
        {index < items.length - 1 && (
          <span
            aria-hidden="true"
            className={cx(
              'absolute left-[6.5px] top-4 h-[calc(100%-0.5rem)] w-px',
              item.state === 'pending' ? 'bg-outline' : 'bg-success/50',
            )}
          />
        )}
        <span
          aria-hidden="true"
          className={cx(
            'relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2',
            item.tone && item.state !== 'pending' && item.state !== 'done' ? TONE_DOT[item.tone] : DOT[item.state],
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cx(
              'text-sm font-semibold',
              item.state === 'pending' ? 'text-muted' : item.state === 'cancelled' ? 'text-danger' : 'text-ink',
            )}
          >
            {item.title}
            {STATE_TEXT[item.state] && (
              <span
                className={cx(
                  'ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-medium',
                  item.state === 'cancelled' ? TONE_CLASSES.danger : TONE_CLASSES[item.tone ?? 'primary'],
                )}
              >
                {STATE_TEXT[item.state]}
              </span>
            )}
          </p>
          {item.when && <p className="text-xs text-muted">{item.when}</p>}
          {item.actor && <p className="text-xs text-muted">{item.actor}</p>}
          {item.note && <p className="mt-1 break-words text-xs text-ink-2">{item.note}</p>}
        </div>
      </li>
    ))}
  </ol>
);
