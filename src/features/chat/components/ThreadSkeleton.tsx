import { Skeleton } from '../../../common/components/ui';

/** Mientras carga un hilo: burbujas grises a un lado y al otro, no un spinner suelto. */
export const ThreadSkeleton = ({ label = 'Cargando mensajes…' }: { label?: string }) => (
  <div className="grid flex-1 content-end gap-3 p-4" role="status" aria-label={label}>
    <Skeleton className="h-9 w-3/5 rounded-2xl" />
    <Skeleton className="ml-auto h-9 w-2/5 rounded-2xl" />
    <Skeleton className="h-14 w-1/2 rounded-2xl" />
    <Skeleton className="ml-auto h-9 w-1/3 rounded-2xl" />
  </div>
);
