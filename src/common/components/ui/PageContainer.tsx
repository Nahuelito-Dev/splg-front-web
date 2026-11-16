import type { ReactNode } from 'react';
import { cx } from './cx';

const SIZES = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1600px]',
  full: '',
} as const;

export type PageContainerSize = keyof typeof SIZES;

interface Props {
  /** Ancho máximo: formularios (`sm`), fichas (`md`), listados (`lg`, el habitual), tableros anchos (`xl`) o sin tope. */
  size?: PageContainerSize;
  /** Separa los bloques de la página con el mismo aire vertical. */
  stack?: boolean;
  className?: string;
  children: ReactNode;
}

/** El contenedor de cada página: centrado, con tope de ancho y el padding responsive del panel. */
export const PageContainer = ({ size = 'lg', stack = false, className, children }: Props) => (
  <div className={cx('mx-auto p-4 md:p-8', SIZES[size], stack && 'space-y-6', className)}>{children}</div>
);
