import AttachFile from '@mui/icons-material/AttachFile';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import Person from '@mui/icons-material/Person';
import type { DragEvent } from 'react';
import { Button, cx } from '../../../common/components/ui';
import { TONE_CLASSES } from '../../../common/components/ui/toneClasses';
import type { FleetTask } from '../../../services/api/types';
import { dueText, dueTone, isOpenTask } from '../fleetTaskKanban';
import type { useFleetOwners } from './useFleetOwners';

type Owners = Pick<ReturnType<typeof useFleetOwners>, 'carMap' | 'driverMap'>;

interface Props extends Owners {
  task: FleetTask;
  canWrite: boolean;
  cancelling?: boolean;
  dragging: boolean;
  onOpen: (task: FleetTask) => void;
  onClose: (task: FleetTask) => void;
  onCancel: (task: FleetTask) => void;
  onDragStart: (task: FleetTask, event: DragEvent) => void;
  onDragEnd: () => void;
}

const ownerOf = ({ task, carMap, driverMap }: { task: FleetTask } & Owners) => {
  const car = task.carId ? carMap.get(task.carId) : undefined;
  if (car) {
    const name = [car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo';
    return {
      icon: <DirectionsCar aria-hidden="true" fontSize="inherit" />,
      text: car.car_patent ? `${name} · ${car.car_patent}` : name,
    };
  }
  const driver = task.deliveryId ? driverMap.get(task.deliveryId) : undefined;
  if (driver)
    return { icon: <Person aria-hidden="true" fontSize="inherit" />, text: driver.user?.full_name ?? 'Chofer' };
  return null;
};

/** Tarjeta del tablero: plan, a quién corresponde, vencimiento con color y adjuntos. */
export const FleetKanbanCard = ({
  task,
  carMap,
  driverMap,
  canWrite,
  cancelling = false,
  dragging,
  onOpen,
  onClose,
  onCancel,
  onDragStart,
  onDragEnd,
}: Props) => {
  const open = isOpenTask(task.status);
  const draggable = canWrite && open;
  const owner = ownerOf({ task, carMap, driverMap });
  // El listado todavía no trae los adjuntos: se muestra la cantidad sólo si viene; la ficha de la tarea los lista.
  const attachments = task.attachments?.length;

  return (
    <li
      draggable={draggable}
      onDragStart={(event) => onDragStart(task, event)}
      onDragEnd={onDragEnd}
      className={cx(
        'rounded-xl border border-outline bg-surface p-3 shadow-card',
        draggable && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block w-full text-left text-[13px] font-semibold text-ink hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {task.plan?.name ?? 'Plan eliminado'}
      </button>
      {(task.referenceNumber || task.category) && (
        <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted">{task.referenceNumber || task.category}</p>
      )}
      {owner && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className="text-muted">{owner.icon}</span>
          <span className="truncate">{owner.text}</span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cx('rounded-full px-2 py-0.5 text-[11.5px] font-medium', TONE_CLASSES[dueTone(task)])}>
          {dueText(task)}
        </span>
        {task.blocks && open && (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11.5px] font-medium text-danger">Bloquea</span>
        )}
        {attachments !== undefined && attachments > 0 && (
          <span
            className="ml-auto inline-flex items-center gap-0.5 text-[11.5px] text-muted"
            aria-label={`${attachments} adjuntos`}
          >
            <AttachFile aria-hidden="true" fontSize="inherit" />
            {attachments}
          </span>
        )}
      </div>
      {draggable && (
        <div className="mt-2.5 flex gap-1.5 border-t border-outline-soft pt-2.5">
          <Button size="sm" variant="secondary" onClick={() => onClose(task)}>
            Cerrar
          </Button>
          <Button size="sm" variant="ghost" disabled={cancelling} onClick={() => onCancel(task)}>
            Cancelar
          </Button>
        </div>
      )}
    </li>
  );
};
