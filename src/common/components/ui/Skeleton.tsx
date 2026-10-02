import { cx } from './cx';

interface SkeletonProps {
  className?: string;
}

/** Barra gris que pulsa: la pieza base de los esqueletos de carga. */
export const Skeleton = ({ className }: SkeletonProps) => (
  <span aria-hidden="true" className={cx('block animate-pulse rounded-md bg-surface-muted', className)} />
);

interface TableSkeletonProps {
  /** Filas a simular; por defecto, las que entran holgadas en una pantalla. */
  rows?: number;
  columns?: number;
}

/** Esqueleto de una tabla mientras carga: lo usa `DataTable` como `loadingOverlay`. */
export const TableSkeleton = ({ rows = 6, columns = 4 }: TableSkeletonProps) => (
  <div role="status" aria-label="Cargando datos" className="flex h-full flex-col gap-2.5 p-4">
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="flex items-center gap-4">
        {Array.from({ length: columns }, (_, col) => (
          <Skeleton key={col} className={cx('h-4', col === 0 ? 'w-1/4' : 'flex-1')} />
        ))}
      </div>
    ))}
  </div>
);

/** Esqueleto de una ficha de detalle: perfil + pares etiqueta/valor. */
export const DetailSkeleton = () => (
  <div role="status" aria-label="Cargando ficha" className="grid gap-6 lg:grid-cols-3">
    <div className="space-y-6 lg:col-span-1">
      <div className="flex items-center gap-3 rounded-card border border-outline bg-surface p-4 shadow-card">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
    <div className="space-y-3 lg:col-span-2">
      <div className="rounded-card border border-outline bg-surface p-4 shadow-card">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
