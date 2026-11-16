import { cx } from '../ui';

/** Tono de una parada en el mapa: los mismos de la lista de paradas. */
const STOP_TONE = {
  normal: 'bg-primary text-on-primary',
  late: 'bg-danger text-white',
  locked: 'bg-ink text-surface',
  current: 'bg-info text-white',
  done: 'bg-success text-white',
  failed: 'bg-muted text-surface',
} as const;

export type StopTone = keyof typeof STOP_TONE;

/** Una parada numerada en su orden de entrega; la elegida, más grande y con aro. */
export const StopPin = ({
  sequence,
  tone = 'normal',
  selected = false,
}: {
  sequence: number;
  tone?: StopTone;
  selected?: boolean;
}) => (
  <span
    className={cx(
      'flex items-center justify-center rounded-full border-2 border-surface font-mono text-xs font-semibold shadow-control',
      selected ? 'h-9 w-9 ring-4 ring-primary/40' : 'h-7 w-7',
      STOP_TONE[tone],
    )}
  >
    {sequence}
  </span>
);
