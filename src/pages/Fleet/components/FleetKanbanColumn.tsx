import { useState, type DragEvent } from 'react';
import { Badge, cx, EmptyState } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { FLEET_TASK_STATUS, labelOf } from '../../../utils/statusLabels';
import { dropAction, type FleetTaskStatus } from '../fleetTaskKanban';
import { FleetKanbanCard } from './FleetKanbanCard';
import type { useFleetOwners } from './useFleetOwners';

type Owners = Pick<ReturnType<typeof useFleetOwners>, 'carMap' | 'driverMap'>;

interface Props extends Owners {
  status: FleetTaskStatus;
  tasks: FleetTask[];
  canWrite: boolean;
  cancelling?: boolean;
  /** La tarjeta que se está arrastrando, para saber si esta columna la acepta. */
  dragged: FleetTask | null;
  onOpen: (task: FleetTask) => void;
  onClose: (task: FleetTask) => void;
  onCancel: (task: FleetTask) => void;
  onDragStart: (task: FleetTask, event: DragEvent) => void;
  onDragEnd: () => void;
  onDropTask: (task: FleetTask, target: FleetTaskStatus) => void;
}

/** Una columna por estado real de la tarea; acepta la tarjeta sólo si esa transición existe en la API. */
export const FleetKanbanColumn = ({ status, tasks, dragged, onDropTask, ...card }: Props) => {
  const [over, setOver] = useState(false);
  const accepts = dragged !== null && dropAction(dragged, status) !== null;

  return (
    <section
      aria-label={`Columna ${labelOf(FLEET_TASK_STATUS, status).text}`}
      onDragOver={(event) => {
        if (!accepts) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (dragged && accepts) onDropTask(dragged, status);
      }}
      className={cx(
        'flex w-[272px] shrink-0 flex-col rounded-xl border bg-surface-sunken p-2.5 transition-colors',
        over ? 'border-primary bg-primary-soft' : accepts ? 'border-dashed border-primary' : 'border-outline',
      )}
    >
      <header className="mb-2.5 flex items-center justify-between px-1">
        <Badge label={labelOf(FLEET_TASK_STATUS, status)} />
        <span className="tabular-nums text-xs text-muted">{tasks.length}</span>
      </header>
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline">
          <EmptyState compact title="Sin tareas" />
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <FleetKanbanCard key={task.taskId} task={task} dragging={dragged?.taskId === task.taskId} {...card} />
          ))}
        </ul>
      )}
    </section>
  );
};
