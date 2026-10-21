import { Badge, Button, DetailList, Modal } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { useCancelFleetTask } from '../../../services/queries/fleet';
import { formatDay, formatNumber } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FLEET_EXPIRATION_STATUS, FLEET_TASK_STATUS, labelOf } from '../../../utils/statusLabels';
import { FleetTaskAttachments } from './FleetTaskAttachments';

interface Props {
  task: FleetTask | null;
  onClose: () => void;
  canWrite: boolean;
  onEdit: (task: FleetTask) => void;
  onRequestClose: (task: FleetTask) => void;
}

/** Una tarea abierta admite editarse, cerrarse o cancelarse; hecha o cancelada, no. */
const isOpenTask = (status: FleetTask['status']) => status !== 'done' && status !== 'cancelled';

export const FleetTaskDetailModal = ({ task, onClose, canWrite, onEdit, onRequestClose }: Props) => {
  const cancelTask = useCancelFleetTask();

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
      {
        onSuccess: () => {
          notify.success('Tarea cancelada');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  const open = task ? isOpenTask(task.status) : false;

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      size="md"
      title={task?.plan?.name ?? 'Tarea'}
      description="Documentación de la flota"
    >
      {task && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={labelOf(FLEET_TASK_STATUS, task.status)} variant="critical" />
            {task.expirationStatus && (
              <Badge label={labelOf(FLEET_EXPIRATION_STATUS, task.expirationStatus)} variant="critical" />
            )}
            {task.blocks && open && (
              <span className="text-xs font-medium text-danger">Sin esto vigente, no puede salir a operar.</span>
            )}
          </div>

          <DetailList
            items={[
              { label: 'Vence el', value: formatDay(task.dueAt) },
              { label: 'Vence a los', value: task.dueKm === null ? '—' : `${formatNumber(task.dueKm)} km`, mono: true },
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
              <Button variant="danger" size="sm" loading={cancelTask.isPending} onClick={() => void handleCancel()}>
                Cancelar tarea
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onRequestClose(task)}>
                Cerrar tarea
              </Button>
              <Button size="sm" onClick={() => onEdit(task)}>
                Editar
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
