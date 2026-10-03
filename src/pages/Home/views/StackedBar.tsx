import { cx } from '../../../common/components/ui/cx';

export interface StackedSegment {
  label: string;
  value: number;
  /** Clase de fondo de Tailwind (sólo tokens de Brasa). */
  className: string;
}

interface Props {
  segments: StackedSegment[];
  label: string;
}

/** Una barra partida en tramos proporcionales; sin valores no se dibuja. */
export const StackedBar = ({ segments, label }: Props) => {
  const total = segments.reduce((acc, segment) => acc + segment.value, 0);
  if (total <= 0) return null;
  return (
    <div
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
      className="flex h-2 w-[84px] shrink-0 gap-0.5 overflow-hidden rounded-full"
    >
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <span key={segment.label} className={cx('h-full', segment.className)} style={{ flexGrow: segment.value }} />
        ))}
    </div>
  );
};
