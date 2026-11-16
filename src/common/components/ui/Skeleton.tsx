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

/** Esqueleto de un listado completo: pestañas, barra de filtros y tabla. Reemplaza al spinner genérico. */
export const ListSkeleton = ({ rows = 6, columns = 4 }: TableSkeletonProps) => (
  <div role="status" aria-label="Cargando listado">
    <div className="flex gap-4 border-b border-outline px-4 pt-3.5">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="mb-3 h-4 w-20" />
      ))}
    </div>
    <div className="flex items-center gap-3 border-b border-outline p-4">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="hidden h-9 w-32 sm:block" />
    </div>
    <TableSkeleton rows={rows} columns={columns} />
  </div>
);

/** Esqueleto de una ficha: portada con avatar, KPIs y pestañas con su contenido. */
export const ProfileSkeleton = () => (
  <div role="status" aria-label="Cargando ficha" className="space-y-6">
    <div className="overflow-hidden rounded-card border border-outline bg-surface shadow-card">
      <Skeleton className="h-24 w-full rounded-none sm:h-28" />
      <div className="px-5 pb-4 sm:px-6">
        <div className="-mt-9 flex items-end gap-4">
          <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full border-4 border-surface" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-outline-soft pt-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex gap-4 border-t border-outline px-4 py-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
    <div className="rounded-card border border-outline bg-surface shadow-card">
      <TableSkeleton rows={4} columns={4} />
    </div>
  </div>
);
