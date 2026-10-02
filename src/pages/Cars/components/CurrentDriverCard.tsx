import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Card, EmptyState, IdentityCell, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useCarAssignments } from '../../../services/queries/fleet';
import { formatDateTime } from '../../../utils/format';

/**
 * Quién usa este vehículo ahora mismo (`GET /car/:id/assignments`): la primera fila de la
 * primera página es siempre la asignación abierta, si existe (`releasedAt: null`) — sólo
 * puede haber una por vehículo al mismo tiempo, y es la más reciente por `assignedAt`.
 */
export const CurrentDriverCard = ({ carId }: { carId: string }) => {
  const navigate = useNavigate();
  const { needsDistributor } = usePermissions();
  const { data, isPending } = useCarAssignments(carId, { page: 0, pageSize: 1 }, !needsDistributor);
  const current = data?.rows[0]?.releasedAt === null ? data.rows[0] : undefined;

  if (needsDistributor) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver quién usa este vehículo."
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-ink">En uso por</h2>
      {isPending ? (
        <LoadingState label="Buscando chofer…" />
      ) : current ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3">
          <IdentityCell
            title={current.driverName ?? 'Sin nombre'}
            subtitle={`Desde ${formatDateTime(current.assignedAt)}`}
            avatarName={current.driverName ?? '?'}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight />}
            onClick={() => navigate(`/deliveries/details/${current.deliveryId}`)}
          >
            Ver chofer
          </Button>
        </div>
      ) : (
        <EmptyState title="Sin chofer en uso" description="Ningún chofer tiene este vehículo en uso ahora." />
      )}
    </Card>
  );
};
