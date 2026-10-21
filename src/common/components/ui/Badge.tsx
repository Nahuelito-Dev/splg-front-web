import type { Label } from '../../../utils/statusLabels';
import { cx } from './cx';
import { TONE_CLASSES, TONE_FILLED_CLASSES } from './toneClasses';

interface Props {
  label: Label;
  /**
   * `soft` (por defecto): fondo suave. `filled`: fondo lleno del tono. `critical`: lleno sólo si el tono es
   * `danger` (vencido, bloqueado, rechazado) y suave en el resto, para que lo crítico se distinga en una tabla.
   */
  variant?: 'soft' | 'filled' | 'critical';
  className?: string;
}

/** Etiqueta de estado. El texto y el tono salen de utils/statusLabels. */
export const Badge = ({ label, variant = 'soft', className }: Props) => {
  const filled = variant === 'filled' || (variant === 'critical' && label.tone === 'danger');
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-2.5 text-xs font-medium',
        'before:h-1.5 before:w-1.5 before:rounded-full before:bg-current',
        filled ? TONE_FILLED_CLASSES[label.tone] : TONE_CLASSES[label.tone],
        className,
      )}
    >
      {label.text}
    </span>
  );
};
