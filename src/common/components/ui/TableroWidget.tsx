import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { errorMessage } from '../../../services/api/errors';
import { Card } from './Card';
import { cx } from './cx';
import { Skeleton } from './Skeleton';

interface Props {
  title: string;
  subtitle?: string;
  /** Selector o botón a la derecha del título. */
  action?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Mensaje cuando la consulta salió bien pero no hay nada que mostrar. */
  empty?: { title: string; description?: string } | null;
  /** Enlace del pie ("Ver todos"). */
  footer?: { label: string; to: string };
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const SkeletonBody = () => (
  <div role="status" aria-label="Cargando" className="grid gap-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-28 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

/**
 * El marco de cada bloque del tablero: encabezado, y en el cuerpo uno de cuatro
 * estados (esqueleto, error con reintento, vacío o el contenido).
 */
export const TableroWidget = ({
  title,
  subtitle,
  action,
  loading = false,
  error,
  onRetry,
  empty,
  footer,
  className,
  bodyClassName,
  children,
}: Props) => {
  const hasError = error !== undefined && error !== null && error !== false;
  return (
    <Card className={cx('flex min-w-0 flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-[18px] pb-1 pt-4">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={cx('flex-1 px-[18px] pb-4 pt-3', bodyClassName)}>
        {hasError ? (
          <div role="alert" className="grid place-items-center gap-2 py-8 text-center">
            <p className="text-sm font-medium text-ink">No se pudo cargar</p>
            <p className="max-w-xs text-xs text-muted">{errorMessage(error)}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-outline bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-control hover:bg-surface-hover"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : loading ? (
          <SkeletonBody />
        ) : empty ? (
          <div className="grid place-items-center gap-1 py-8 text-center">
            <p className="text-sm font-medium text-ink">{empty.title}</p>
            {empty.description && <p className="max-w-xs text-xs text-muted">{empty.description}</p>}
          </div>
        ) : (
          children
        )}
      </div>
      {footer && (
        <Link
          to={footer.to}
          className="flex items-center justify-center gap-1.5 border-t border-outline-soft py-2.5 text-[12.5px] font-semibold text-primary-strong transition-colors hover:bg-primary-soft"
        >
          {footer.label} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
    </Card>
  );
};
