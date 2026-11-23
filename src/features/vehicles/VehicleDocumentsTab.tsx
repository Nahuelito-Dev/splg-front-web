import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, ErrorState, ListSkeleton } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCarDocuments } from '../../services/queries/fleet';
import { formatDate } from '../../utils/format';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_STATUS } from '../../utils/statusLabels';

/**
 * Pestaña «Documentos»: la documentación de flota del vehículo (seguro, VTV, service…) con su vencimiento, y el aviso
 * si está inhabilitado por un vencimiento que bloquea. Los archivos se gestionan en la ficha.
 */
export const VehicleDocumentsTab = ({ carId }: { carId: string }) => {
  const { needsDistributor } = usePermissions();
  const { data, isPending, error, refetch } = useCarDocuments(carId, !needsDistributor);
  if (needsDistributor) {
    return (
      <EmptyState
        compact
        title="Elegí una distribuidora"
        description="Con «Ver como» se ve la documentación de sus vehículos."
      />
    );
  }
  if (isPending) return <ListSkeleton rows={3} columns={2} />;
  if (error || !data) return <ErrorState error={error} resource="La documentación" onRetry={() => void refetch()} />;
  const open = data.tasks.filter((task) => task.status !== 'cancelled');
  return (
    <div className="space-y-3">
      {data.isLocked && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          Inhabilitado por documentación vencida: no puede salir.
        </p>
      )}
      {open.length === 0 ? (
        <EmptyState compact title="Sin documentación cargada" description="Se carga desde la ficha del vehículo." />
      ) : (
        <ul aria-label="Documentación del vehículo" className="divide-y divide-outline-soft">
          {open.map((task) => (
            <li key={task.taskId} className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {task.plan?.name ?? 'Documento'}
                </span>
                <span className="block text-xs text-muted">
                  {task.dueAt
                    ? `Vence el ${formatDate(task.dueAt)}`
                    : task.dueKm !== null
                      ? `A los ${task.dueKm.toLocaleString('es-AR')} km`
                      : 'Sin vencimiento'}
                </span>
              </span>
              <Badge
                label={
                  task.expirationStatus
                    ? FLEET_EXPIRATION_STATUS[task.expirationStatus]
                    : FLEET_TASK_STATUS[task.status]
                }
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      )}
      <Link
        to={`/cars/details/${carId}`}
        className="text-xs font-medium text-primary-strong underline-offset-2 hover:underline"
      >
        Ver archivos y vencimientos en la ficha
      </Link>
    </div>
  );
};
