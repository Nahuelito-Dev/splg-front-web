import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CirclePlus, Pencil, XCircle } from 'lucide-react';
import { Badge, Button, Card, DetailList, DetailSkeleton, ErrorState, PageHeader } from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { useCar } from '../../services/queries/cars';
import { useCancelFleetTask, useFleetTask } from '../../services/queries/fleet';
import { formatDay, formatNumber } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_STATUS, labelOf } from '../../utils/statusLabels';
import { FleetTaskAttachments } from './components/FleetTaskAttachments';
import { FleetTaskCloseModal } from './components/FleetTaskCloseModal';
import { FleetTaskFormModal } from './components/FleetTaskFormModal';

const isOpenTask = (status: string) => status !== 'done' && status !== 'cancelled';

/** La ficha de una tarea de flota (`GET /fleet/tasks/:id`), con su ruta propia. */
export const FleetTaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/fleet/tasks');
  const { canWrite, writeHint } = usePermissions();
  const { data: task, isPending, error, refetch } = useFleetTask(id);
  const { data: car } = useCar(task?.carId ?? undefined);
  const cancelTask = useCancelFleetTask();
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleCancel = async () => {
    if (!task) return;
    const confirmed = await confirm({
      title: '¿Cancelar la tarea?',
      text: `Se cancela «${task.plan?.name ?? 'la tarea'}». No se puede deshacer.`,
      confirmText: 'Cancelar tarea',
      danger: true,
    });
    if (!confirmed) return;
    cancelTask.mutate(
      { id: task.taskId, body: {} },
      { onSuccess: () => notify.success('Tarea cancelada'), onError: notify.error },
    );
  };

  const open = task ? isOpenTask(task.status) : false;
  const subject: 'vehicle' | 'driver' = task?.carId ? 'vehicle' : 'driver';
  const ownerId = task?.carId ?? task?.deliveryId ?? '';

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader
        title={task?.plan?.name ?? 'Tarea'}
        description="Documentación de la flota"
        breadcrumbs={[{ label: 'Tareas', to: '/fleet/tasks', onClick: goBack }, { label: task?.plan?.name ?? 'Tarea' }]}
        actions={task && <Badge label={labelOf(FLEET_TASK_STATUS, task.status)} />}
      />

      {isPending ? (
        <DetailSkeleton />
      ) : error || !task ? (
        <ErrorState error={error} resource="La tarea" onRetry={() => void refetch()} />
      ) : (
        <>
          <Card className="space-y-5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {task.expirationStatus && <Badge label={labelOf(FLEET_EXPIRATION_STATUS, task.expirationStatus)} />}
              {task.blocks && open && (
                <span className="text-xs font-medium text-danger">Sin esto vigente, no puede salir a operar.</span>
              )}
            </div>

            <DetailList
              items={[
                {
                  label: 'Vehículo',
                  value: car ? `${car.car_patent ?? ''} ${car.car_brand ?? ''}`.trim() || '—' : '—',
                },
                { label: 'Vence el', value: formatDay(task.dueAt) },
                {
                  label: 'Vence a los',
                  value: task.dueKm === null ? '—' : `${formatNumber(task.dueKm)} km`,
                  mono: true,
                },
                { label: 'Proveedor', value: task.provider || '—' },
                { label: 'Nº de referencia', value: task.referenceNumber || '—', mono: true },
                { label: 'Categoría', value: task.category || '—' },
                { label: 'Turno agendado', value: formatDay(task.scheduledAt) },
                { label: 'Se hizo el', value: formatDay(task.performedAt) },
                {
                  label: 'Kilometraje al hacerlo',
                  value: task.odometerKm === null ? '—' : formatNumber(task.odometerKm),
                },
                { label: 'Notas', value: task.notes || '—', wide: true },
              ]}
            />

            <FleetTaskAttachments taskId={task.taskId} canWrite={canWrite} />

            {canWrite && open && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-outline pt-4">
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle />}
                  loading={cancelTask.isPending}
                  onClick={() => void handleCancel()}
                >
                  Cancelar tarea
                </Button>
                <Button variant="secondary" size="sm" icon={<CirclePlus />} onClick={() => setClosing(true)}>
                  Cerrar tarea
                </Button>
                <Button size="sm" icon={<Pencil />} title={writeHint} onClick={() => setEditing(true)}>
                  Editar
                </Button>
              </div>
            )}
          </Card>

          <FleetTaskFormModal
            open={editing}
            onClose={() => setEditing(false)}
            subject={subject}
            ownerId={ownerId}
            carType={car?.type_car}
            task={task}
          />
          <FleetTaskCloseModal open={closing} onClose={() => setClosing(false)} task={task} />
        </>
      )}
    </div>
  );
};
