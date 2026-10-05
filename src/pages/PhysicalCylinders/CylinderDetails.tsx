import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
  UserRefLink,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useCylinder } from '../../services/queries/physicalCylinders';
import { formatCurrency, formatDate, formatDateTime, formatShortId } from '../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../utils/statusLabels';
import { CylinderTimeline } from './components/CylinderTimeline';
import { TransitionModal } from './components/TransitionModal';

/** La ficha de un envase físico (`GET /cylinders/:id`): sus datos, su estado y su historial de movimientos. */
export const CylinderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/physical-cylinders');
  const { canWrite, writeHint } = usePermissions();
  const { data: cylinder, isPending, error, refetch } = useCylinder(id);
  useCrumbLeaf(cylinder?.serial, goBack);
  const [transitioning, setTransitioning] = useState(false);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Ficha del envase"
        actions={
          cylinder && (
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRightLeft />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setTransitioning(true)}
            >
              Mover de estado
            </Button>
          )
        }
      />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !cylinder ? (
        <ErrorState error={error} resource="El envase" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-mono text-lg font-semibold text-ink">{cylinder.serial}</h2>
                <p className="text-sm text-muted">
                  {cylinder.gas_cylinder
                    ? `${cylinder.gas_cylinder.type} · ${cylinder.gas_cylinder.weight} kg`
                    : 'Sin producto asignado'}
                </p>
              </div>
              <Badge label={labelOf(CYLINDER_STATE, cylinder.state)} />
            </div>
            <DetailList
              className="mt-5 border-t border-outline pt-5"
              items={[
                {
                  label: 'En poder de',
                  value: cylinder.current_customer_id ? (
                    <>
                      <UserRefLink
                        userId={cylinder.current_customer_id}
                        name={cylinder.current_customer?.full_name ?? 'Cliente sin nombre'}
                      />
                      {cylinder.current_customer?.phone_number ? ` · ${cylinder.current_customer.phone_number}` : ''}
                    </>
                  ) : (
                    'La distribuidora'
                  ),
                  wide: true,
                },
                {
                  label: 'Pedido actual',
                  value: cylinder.current_order_id ? formatShortId(cylinder.current_order_id) : '—',
                  mono: Boolean(cylinder.current_order_id),
                },
                {
                  label: 'Garantía',
                  value: cylinder.deposit > 0 ? formatCurrency(cylinder.deposit) : 'Sin garantía',
                  mono: cylinder.deposit > 0,
                },
                { label: 'Fabricación', value: formatDate(cylinder.manufactured_at) },
                { label: 'Última inspección', value: formatDate(cylinder.last_inspection_at) },
                { label: 'Alta', value: formatDateTime(cylinder.createdAt) },
                { label: 'Última modificación', value: formatDateTime(cylinder.updatedAt) },
                { label: 'ID del envase', value: cylinder.cylinder_id, mono: true, wide: true },
              ]}
            />
          </Card>

          <Card className="min-w-0 p-6 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-ink">Movimientos</h2>
            <CylinderTimeline cylinderId={cylinder.cylinder_id} />
          </Card>
        </div>
      )}

      <TransitionModal open={transitioning} onClose={() => setTransitioning(false)} cylinder={cylinder ?? null} />
    </div>
  );
};
