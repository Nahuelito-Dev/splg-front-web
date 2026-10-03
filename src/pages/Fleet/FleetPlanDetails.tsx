import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Power, PowerOff } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useFleetPlan, useUpdateFleetPlan } from '../../services/queries/fleet';
import { confirm, notify } from '../../utils/notifications';
import { FLEET_PLAN_SUBJECT, FLEET_TASK_CRITICALITY, labelOf } from '../../utils/statusLabels';
import { FleetPlanFormModal } from './components/FleetPlanFormModal';
import { FleetPlanTasks } from './components/FleetPlanTasks';
import { intervalText } from './fleetPlanInterval';

/** La ficha de un plan de flota (`GET /fleet/plans/:id`): la regla y las tareas que dispara. */
export const FleetPlanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/fleet/plans');
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const { data: plan, isPending, error, refetch } = useFleetPlan(id, !needsDistributor);
  const updatePlan = useUpdateFleetPlan();
  const [editing, setEditing] = useState(false);

  const handleToggle = async () => {
    if (!plan) return;
    const activate = !plan.isActive;
    const confirmed = await confirm({
      title: activate ? '¿Activar el plan?' : '¿Desactivar el plan?',
      text: activate
        ? `«${plan.name}» vuelve a generar tareas hacia adelante.`
        : `«${plan.name}» deja de generar tareas nuevas. Las tareas ya creadas no se tocan.`,
    });
    if (!confirmed) return;
    updatePlan.mutate(
      { id: plan.planId, body: { isActive: activate } },
      { onSuccess: () => notify.success(activate ? 'Plan activado' : 'Plan desactivado'), onError: notify.error },
    );
  };

  if (needsDistributor) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver sus planes."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Ficha del plan"
        breadcrumbs={[{ label: 'Planes', to: '/fleet/plans', onClick: goBack }, { label: plan?.name ?? 'Plan' }]}
        actions={
          plan &&
          canWrite && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={plan.isActive ? <PowerOff /> : <Power />}
                loading={updatePlan.isPending}
                onClick={() => void handleToggle()}
              >
                {plan.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button size="sm" icon={<Pencil />} title={writeHint} onClick={() => setEditing(true)}>
                Editar
              </Button>
            </>
          )
        }
      />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !plan ? (
        <ErrorState error={error} resource="El plan" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                <p className="text-sm text-muted">{labelOf(FLEET_PLAN_SUBJECT, plan.subject).text}</p>
              </div>
              <Badge
                label={plan.isActive ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'neutral' }}
              />
            </div>
            <DetailList
              className="mt-5 border-t border-outline pt-5"
              items={[
                { label: 'Vencimiento', value: intervalText(plan), wide: true },
                { label: 'Aviso previo', value: `${plan.leadTimeDays} días` },
                { label: 'Criticidad', value: <Badge label={labelOf(FLEET_TASK_CRITICALITY, plan.criticality)} /> },
                { label: 'Tipo de vehículo', value: plan.carType ?? 'Todos' },
                { label: 'ID del plan', value: plan.planId, mono: true, wide: true },
              ]}
            />
          </Card>

          <div className="min-w-0 lg:col-span-2">
            <FleetPlanTasks planId={plan.planId} />
          </div>
        </div>
      )}

      <FleetPlanFormModal open={editing} onClose={() => setEditing(false)} plan={plan ?? null} />
    </div>
  );
};
