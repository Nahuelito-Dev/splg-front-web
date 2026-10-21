import { Badge } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { formatDay, formatNumber } from '../../../utils/format';
import { FLEET_EXPIRATION_STATUS, labelOf } from '../../../utils/statusLabels';

/** El vencimiento de una tarea (fecha o kilometraje) con su vigencia. */
export const FleetTaskDueCell = ({ task }: { task: FleetTask }) => (
  <div className="leading-tight">
    <span className="block text-ink">
      {task.dueAt ? formatDay(task.dueAt) : task.dueKm !== null ? `${formatNumber(task.dueKm)} km` : '—'}
    </span>
    {task.expirationStatus && (
      <span className="mt-0.5 block">
        <Badge label={labelOf(FLEET_EXPIRATION_STATUS, task.expirationStatus)} variant="critical" />
      </span>
    )}
  </div>
);
