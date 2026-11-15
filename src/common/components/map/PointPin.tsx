import { cx } from '../ui';

/** Un punto chico: el que se prueba en las zonas o un vértice de un polígono que se está dibujando. */
export const PointPin = ({ size = 'md' }: { size?: 'sm' | 'md' }) => (
  <span
    className={cx(
      'block rounded-full border-2 border-surface bg-ink shadow-control',
      size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
    )}
  />
);
