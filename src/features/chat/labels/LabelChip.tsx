import { Tag } from 'lucide-react';
import { cx } from '../../../common/components/ui';
import { labelColorClasses } from './labelColors';

interface Props {
  name: string;
  color: string;
  size?: 'xs' | 'sm';
  className?: string;
}

/** Una etiqueta de la bandeja: su nombre con el color que eligió la empresa (sin el punto de los estados). */
export const LabelChip = ({ name, color, size = 'sm', className }: Props) => (
  <span
    className={cx(
      'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border font-medium leading-none',
      size === 'xs' ? 'h-[18px] px-1.5 text-[10px]' : 'h-[22px] px-2 text-xs',
      labelColorClasses(color),
      className,
    )}
  >
    <Tag aria-hidden="true" className={cx('shrink-0', size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
    <span className="truncate">{name}</span>
  </span>
);
