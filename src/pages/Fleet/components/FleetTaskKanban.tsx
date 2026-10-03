import { useMemo, useState, type DragEvent } from 'react';
import type { FleetTask } from '../../../services/api/types';
import { dropAction, groupByStatus, KANBAN_COLUMNS, type FleetTaskStatus } from '../fleetTaskKanban';
import { FleetKanbanColumn } from './FleetKanbanColumn';
import type { useFleetOwners } from './useFleetOwners';

type Owners = Pick<ReturnType<typeof useFleetOwners>, 'carMap' | 'driverMap'>;

interface Props extends Owners {
  tasks: FleetTask[];
  canWrite: boolean;
  /** Hay una cancelación en curso: no se puede lanzar otra. */
  cancelling?: boolean;
  onOpen: (task: FleetTask) => void;
  onClose: (task: FleetTask) => void;
  onCancel: (task: FleetTask) => void;
}

/** Tablero de tareas por estado. Arrastrar a «Hecha» cierra la tarea y a «Cancelada» la cancela; no hay otras transiciones. */
export const FleetTaskKanban = ({ tasks, onClose, onCancel, cancelling, ...rest }: Props) => {
  const [dragged, setDragged] = useState<FleetTask | null>(null);
  const groups = useMemo(() => groupByStatus(tasks), [tasks]);

  const handleDragStart = (task: FleetTask, event: DragEvent) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.taskId);
    setDragged(task);
  };

  const handleDrop = (task: FleetTask, target: FleetTaskStatus) => {
    setDragged(null);
    const action = dropAction(task, target);
    if (action === 'close') onClose(task);
    if (action === 'cancel' && !cancelling) onCancel(task);
  };

  return (
    <div className="overflow-x-auto p-4">
      <div className="flex min-w-max items-start gap-3">
        {KANBAN_COLUMNS.map((status) => (
          <FleetKanbanColumn
            key={status}
            status={status}
            tasks={groups[status]}
            dragged={dragged}
            cancelling={cancelling}
            onClose={onClose}
            onCancel={onCancel}
            onDragStart={handleDragStart}
            onDragEnd={() => setDragged(null)}
            onDropTask={handleDrop}
            {...rest}
          />
        ))}
      </div>
    </div>
  );
};
