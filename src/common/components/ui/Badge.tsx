import type { Label } from '../../../utils/statusLabels';
import { cx } from './cx';
import { TONE_CLASSES } from './toneClasses';

interface Props {
  label: Label;
  className?: string;
}

/**
 * Etiqueta de estado: una sola variante suave (fondo del tono, texto del tono y un punto), de 22 px de alto. El texto y
 * el tono salen de utils/statusLabels. Va un estado por celda: el segundo dato se muestra como texto secundario.
 */
export const Badge = ({ label, className }: Props) => (
  <span
    className={cx(
      'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium leading-none',
      'before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current',
      TONE_CLASSES[label.tone],
      className,
    )}
  >
    {label.text}
  </span>
);
