import { Hand } from 'lucide-react';
import { cx } from '../../../common/components/ui';
import { formatDateTime, formatElapsed } from '../../../utils/format';
import { AWAITING_HUMAN_LABEL } from '../awaitingHuman';

interface Props {
  /** `awaitingHumanSince` de la conversación. */
  since: string;
  /** El «ahora» de quien dibuja (un reloj que avanza por minuto), para «hace 5m». */
  now: number;
  className?: string;
}

/** La marca de una conversación que el asistente pasó a una persona, con desde cuándo espera. */
export const AwaitingHumanMark = ({ since, now, className }: Props) => (
  <span
    className={cx(
      'inline-flex max-w-full items-center gap-1 rounded-full bg-warn-soft px-1.5 py-px text-[10.5px] font-medium text-warn',
      className,
    )}
  >
    <Hand aria-hidden="true" className="h-3 w-3 shrink-0" />
    <span className="truncate">{AWAITING_HUMAN_LABEL}</span>
    <time dateTime={since} title={`Desde el ${formatDateTime(since)}`} className="shrink-0 font-normal">
      · {formatElapsed(since, now)}
    </time>
  </span>
);
