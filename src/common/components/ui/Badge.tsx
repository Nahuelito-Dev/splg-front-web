import type { Label } from '../../../utils/statusLabels';
import { cx } from './cx';
import { TONE_CLASSES } from './toneClasses';

interface Props {
  label: Label;
  className?: string;
}

/** Etiqueta de estado. El texto y el tono salen de utils/statusLabels. */
export const Badge = ({ label, className }: Props) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-2.5 text-xs font-medium',
      'before:h-1.5 before:w-1.5 before:rounded-full before:bg-current',
      TONE_CLASSES[label.tone],
      className,
    )}
  >
    {label.text}
  </span>
);
