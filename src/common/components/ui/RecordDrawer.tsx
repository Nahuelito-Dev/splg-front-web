import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FROM_LIST_STATE } from '../../../hooks/useBackToList';
import { Drawer } from './Drawer';
import { ErrorState } from './QueryState';
import { Skeleton } from './Skeleton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Línea bajo el título: el id corto, la fecha. */
  description?: string;
  /** Etiquetas de estado bajo el encabezado. */
  badges?: ReactNode;
  /** Ruta de la ficha completa: suma el enlace «Abrir ficha completa» (conserva la lista al volver). */
  fullPageTo?: string;
  /** Texto del enlace a la ficha completa, si no alcanza con «Abrir ficha completa». */
  fullPageLabel?: string;
  /** El detalle fresco todavía no llegó y no hay nada de la fila para mostrar. */
  loading?: boolean;
  /** Falló la carga del detalle y no hay nada de la fila para mostrar. */
  error?: unknown;
  onRetry?: () => void;
  /** Nombre del recurso para el mensaje de error («El pedido»). */
  resource?: string;
  /** Acciones fijas al pie, a la izquierda del enlace a la ficha. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
  children: ReactNode;
}

/**
 * Detalle de un registro de un listado sin salir de él: un `Drawer` con el encabezado, las etiquetas, el estado de
 * carga y el enlace a la ficha completa ya resueltos. Cada recurso aporta sólo el contenido y sus acciones.
 */
export const RecordDrawer = ({
  open,
  onClose,
  title,
  description,
  badges,
  fullPageTo,
  fullPageLabel = 'Abrir ficha completa',
  loading = false,
  error,
  onRetry,
  resource,
  footer,
  size = 'md',
  children,
}: Props) => (
  <Drawer
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    size={size}
    footer={
      (footer || fullPageTo) && (
        <>
          {footer}
          {fullPageTo && (
            <Link
              to={fullPageTo}
              state={FROM_LIST_STATE}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {fullPageLabel}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      )
    }
  >
    {badges && <div className="mb-4 flex flex-wrap items-center gap-2">{badges}</div>}
    {loading ? (
      <div role="status" aria-label="Cargando detalle" className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    ) : error ? (
      <ErrorState error={error} resource={resource} onRetry={onRetry} />
    ) : (
      children
    )}
  </Drawer>
);
