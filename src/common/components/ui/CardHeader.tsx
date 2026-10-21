import type { ReactNode } from 'react';
import { cx } from './cx';

interface Props {
  title: string;
  subtitle?: string;
  /** Etiqueta de estado al lado del título. */
  badge?: ReactNode;
  /** Ícono chico antes del título. */
  icon?: ReactNode;
  /** Botón o enlace a la derecha («Agregar», «Ver todo»). */
  action?: ReactNode;
  /** Nivel del encabezado dentro de la página (las tarjetas de una ficha cuelgan del h1: `h2` por defecto). */
  as?: 'h2' | 'h3';
  /** Separación con el contenido; por defecto `mb-4`. */
  className?: string;
}

/** El encabezado de las tarjetas de una ficha: mismo tamaño y peso en Pedidos, Clientes, Envases y Finanzas. */
export const CardHeader = ({ title, subtitle, icon, badge, action, as: Heading = 'h2', className = 'mb-4' }: Props) => (
  <div className={cx('flex items-start justify-between gap-3', className)}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Heading className="flex items-center gap-2 text-base font-semibold text-ink">
          {icon && (
            <span aria-hidden="true" className="inline-flex shrink-0 text-muted [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </span>
          )}
          {title}
        </Heading>
        {badge}
      </div>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
