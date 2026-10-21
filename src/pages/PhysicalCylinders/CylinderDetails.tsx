import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRightLeft, PencilLine, Trash2 } from 'lucide-react';
import {
  AuditHistoryLink,
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
  UserRefLink,
  PageContainer,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useCylinder } from '../../services/queries/physicalCylinders';
import { formatCurrency, formatDateTime, formatArgentinaDay, formatDay, formatShortId } from '../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../utils/statusLabels';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylinderVigenciaCard } from './components/CylinderVigenciaCard';
import { CylinderTimeline } from './components/CylinderTimeline';
import { RetireCylinderModal } from './components/RetireCylinderModal';
import { canEditCylinder, canRetire, RETIRE_HINT, RETIRED_HINT } from './cylinderTransitions';
import { TransitionModal } from './components/TransitionModal';

/** La ficha de un envase físico (`GET /cylinders/:id`): sus datos, su estado y su historial de movimientos. */
export const CylinderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/physical-cylinders');
  const { canWrite, writeHint } = usePermissions();
  const { data: cylinder, isPending, error, refetch } = useCylinder(id);
  useCrumbLeaf(cylinder?.serial, goBack);
  const [transitioning, setTransitioning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [retiring, setRetiring] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        title="Ficha del envase"
        secondaryActions={
          cylinder
            ? [
                ...(canEditCylinder(cylinder)
                  ? [
                      {
                        label: 'Editar',
                        icon: <PencilLine />,
                        disabled: !canWrite,
                        title: writeHint,
                        onClick: () => setEditing(true),
                      },
                    ]
                  : []),
                {
                  label: 'Dar de baja',
                  icon: <Trash2 />,
                  tone: 'danger' as const,
                  disabled: !canWrite,
                  title: writeHint,
                  blockedReason: canWrite && !canRetire(cylinder) ? RETIRE_HINT : undefined,
                  onClick: () => setRetiring(true),
                },
              ]
            : []
        }
        actions={
          cylinder && (
            <>
              <AuditHistoryLink entity="Cylinder" recordId={cylinder.cylinder_id} />
              <Button
                size="sm"
                icon={<ArrowRightLeft />}
                disabled={!canWrite}
                title={writeHint}
                blockedReason={canWrite && cylinder.state === 'retired' ? RETIRED_HINT : undefined}
                onClick={() => setTransitioning(true)}
              >
                Mover de estado
              </Button>
            </>
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
                { label: 'Fabricación', value: formatDay(cylinder.manufactured_at) },
                { label: 'Última inspección', value: formatArgentinaDay(cylinder.last_inspection_at) },
                { label: 'Vencimiento', value: formatArgentinaDay(cylinder.expires_at) },
                { label: 'Alta', value: formatDateTime(cylinder.createdAt) },
                { label: 'Última modificación', value: formatDateTime(cylinder.updatedAt) },
                { label: 'ID del envase', value: cylinder.cylinder_id, mono: true, wide: true },
              ]}
            />
          </Card>

          <Card className="min-w-0 p-6 lg:col-span-2">
            <CardHeader title="Movimientos" />
            <CylinderTimeline cylinderId={cylinder.cylinder_id} />
          </Card>

          <CylinderVigenciaCard cylinderId={cylinder.cylinder_id} retired={cylinder.state === 'retired'} />
        </div>
      )}

      <CylinderFormModal open={editing} onClose={() => setEditing(false)} cylinder={cylinder ?? null} />
      <RetireCylinderModal cylinder={retiring ? (cylinder ?? null) : null} onClose={() => setRetiring(false)} />
      <TransitionModal open={transitioning} onClose={() => setTransitioning(false)} cylinder={cylinder ?? null} />
    </PageContainer>
  );
};
