import { Shuffle } from 'lucide-react';
import { cx } from '../../../common/components/ui';
import { AUTO_ASSIGNED } from '../../../utils/statusLabels';

/** La marca chica de la lista: la conversación la asignó la asignación automática (8b). */
export const AutoAssignedMark = ({ className }: { className?: string }) => (
  <span
    title={AUTO_ASSIGNED.text}
    className={cx(
      'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-info-soft px-1.5 py-px text-[10px] font-medium text-info',
      className,
    )}
  >
    <Shuffle aria-hidden="true" className="h-2.5 w-2.5" />
    Automática
    <span className="sr-only"> (asignada automáticamente)</span>
  </span>
);
