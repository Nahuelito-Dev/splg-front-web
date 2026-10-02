import { initialsOf } from '../../../utils/format';
import { cx } from './cx';

const TONES = ['bg-llama-500', 'bg-info', 'bg-success', 'bg-gas-600', 'bg-tinta-700', 'bg-danger'] as const;

/** Mismo nombre, mismo color: el hash de las letras elige el tono. */
const toneFor = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES: Record<NonNullable<Props['size']>, string> = {
  lg: 'h-14 w-14 text-xl',
  md: 'h-[30px] w-[30px] text-[11px]',
  sm: 'h-6 w-6 text-[10px]',
};

/** Iniciales sobre un color estable. Decorativo: el nombre siempre está escrito al lado. */
export const Avatar = ({ name, size = 'md', className }: Props) => (
  <span
    aria-hidden="true"
    className={cx(
      'grid shrink-0 place-items-center rounded-full font-semibold text-white',
      SIZES[size],
      toneFor(name),
      className,
    )}
  >
    {initialsOf(name)}
  </span>
);
