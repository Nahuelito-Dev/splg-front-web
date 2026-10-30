import { initialsOf } from '../../../utils/format';
import { cx } from './cx';
import { AVATAR_SIZES, type AvatarSize } from './avatarSizes';

const TONES = ['bg-llama-500', 'bg-info', 'bg-success', 'bg-gas-600', 'bg-tinta-700', 'bg-danger'] as const;

/** Mismo nombre, mismo color: el hash de las letras elige el tono. */
const toneFor = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

interface Props {
  name: string;
  size?: AvatarSize;
  className?: string;
}

/** Iniciales sobre un color estable. Decorativo: el nombre siempre está escrito al lado. */
export const Avatar = ({ name, size = 'md', className }: Props) => (
  <span
    aria-hidden="true"
    className={cx(
      'grid shrink-0 place-items-center rounded-full font-semibold text-white',
      AVATAR_SIZES[size],
      toneFor(name),
      className,
    )}
  >
    {initialsOf(name)}
  </span>
);
