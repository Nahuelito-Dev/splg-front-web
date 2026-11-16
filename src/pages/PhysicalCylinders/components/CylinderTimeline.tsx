import { Badge, EmptyState, ErrorState, LoadingState, UserRefLink } from '../../../common/components/ui';
import { useCylinderHistory } from '../../../services/queries/physicalCylinders';
import { useUserNames } from '../../../services/queries/userNames';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

/** Los movimientos auditables de un envase (`GET /cylinders/:id/history`), como línea de tiempo. */
export const CylinderTimeline = ({ cylinderId }: { cylinderId: string }) => {
  const { data: movements, isPending, error, refetch } = useCylinderHistory(cylinderId, true);
  const { nameOf, loading } = useUserNames(movements?.map((m) => m.actor_user_id) ?? []);

  if (isPending) return <LoadingState label="Cargando movimientos…" />;
  if (error) return <ErrorState error={error} resource="El historial" onRetry={() => void refetch()} />;
  if (movements.length === 0) {
    return (
      <EmptyState title="Sin movimientos" description="Todavía no se registraron transiciones para este envase." />
    );
  }

  return (
    <ol className="relative ml-2 space-y-6 border-l border-outline">
      {movements.map((m) => (
        <li key={m.movement_id} className="ml-4">
          <span
            aria-hidden="true"
            className="absolute -left-1.5 h-3 w-3 rounded-full border border-surface bg-primary"
          />
          <div className="flex flex-wrap items-center gap-2">
            {m.from_state && <Badge label={labelOf(CYLINDER_STATE, m.from_state)} />}
            {m.from_state && (
              <span aria-hidden="true" className="text-muted">
                →
              </span>
            )}
            <Badge label={labelOf(CYLINDER_STATE, m.to_state)} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDateTime(m.createdAt)}
            {m.order_id ? ` · Pedido ${formatShortId(m.order_id)}` : ''}
            {m.actor_user_id ? (
              <>
                {' · Por '}
                <UserRefLink userId={m.actor_user_id} name={nameOf(m.actor_user_id)} loading={loading} />
              </>
            ) : (
              ' · Sin registro de quién lo hizo'
            )}
          </p>
          {m.note && <p className="mt-1 text-sm text-ink">{m.note}</p>}
        </li>
      ))}
    </ol>
  );
};
