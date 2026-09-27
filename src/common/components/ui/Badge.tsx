import type { Label, Tone } from '../../../utils/statusLabels';
import { cx } from './cx';

const TONES: Record<Tone, string> = {
  neutral: 'bg-tinta-100 text-tinta-700',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary-strong',
  accent: 'bg-accent-soft text-gas-800',
};

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
      TONES[label.tone],
      className,
    )}
  >
    {label.text}
  </span>
);
