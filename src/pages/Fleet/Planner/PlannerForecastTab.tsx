import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { ForecastItem, ForecastVehicle } from '../../../services/api/types';
import { usePlannerForecast, useReplanTask } from '../../../services/queries/planner';
import { formatDay } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { FLEET_TASK_CRITICALITY, labelOf } from '../../../utils/statusLabels';
import {
  PLANNING_CASE_STATUS,
  daysLeftText,
  forecastState,
  formatWindow,
  isFuture,
  projectionReason,
  usageText,
} from './plannerLabels';
import { WindowFormModal } from './WindowFormModal';

interface Forcing {
  taskId: string;
  taskName: string;
  patent: string | null;
}

const ItemRow = ({
  item,
  patent,
  onForce,
  onReplan,
  canWrite,
  writeHint,
}: {
  item: ForecastItem;
  patent: string | null;
  onForce: (target: Forcing) => void;
  onReplan: (item: ForecastItem) => void;
  canWrite: boolean;
  writeHint?: string;
}) => (
  <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
        {item.taskName}
        <Badge label={labelOf(FLEET_TASK_CRITICALITY, item.criticality)} variant="critical" />
      </p>
      <p className="text-[13px] text-ink-2">
        {item.projectedDueAt ? `${formatDay(item.projectedDueAt)} · ` : ''}
        {daysLeftText(item.daysLeft)}
      </p>
      <p className="text-xs text-muted">{projectionReason(item)}</p>
      {isFuture(item.scheduledAt) && (
        <p className="text-xs text-muted">Taller: {formatWindow(item.scheduledAt, null)}</p>
      )}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Badge label={forecastState(item)} variant="critical" />
      {item.needsWorkshop && (
        <>
          <Button
            size="sm"
            variant="secondary"
            icon={<CalendarPlus />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => onForce({ taskId: item.taskId, taskName: item.taskName, patent })}
          >
            Fijar ventana
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => onReplan(item)}
          >
            Re-planificar
          </Button>
        </>
      )}
      {item.caseId && (
        <Link
          className="text-xs font-semibold text-primary-strong hover:underline"
          to={`/fleet/planner?status=&case=${item.caseId}`}
        >
          Ver caso
        </Link>
      )}
    </div>
  </li>
);

const VehicleCard = ({
  vehicle,
  onForce,
  onReplan,
  canWrite,
  writeHint,
}: {
  vehicle: ForecastVehicle;
  onForce: (target: Forcing) => void;
  onReplan: (item: ForecastItem) => void;
  canWrite: boolean;
  writeHint?: string;
}) => (
  <Card className="p-5">
    <CardHeader
      title={vehicle.patent ?? 'Sin patente'}
      subtitle={usageText(vehicle)}
      className=""
      badge={vehicle.nextWindow ? <Badge label={PLANNING_CASE_STATUS[vehicle.nextWindow.status]} /> : undefined}
    />
    <p className="mt-1 text-[13px] text-ink-2">
      {vehicle.nextWindow
        ? `Próxima ventana de taller: ${formatWindow(vehicle.nextWindow.start, vehicle.nextWindow.end)}`
        : 'Sin ventana de taller por ahora.'}
    </p>
    {vehicle.items.length === 0 ? (
      <p className="mt-3 text-sm text-muted">Sin tareas abiertas.</p>
    ) : (
      <ul className="mt-2 divide-y divide-outline-soft">
        {vehicle.items.map((item) => (
          <ItemRow
            key={item.taskId}
            item={item}
            patent={vehicle.patent}
            onForce={onForce}
            onReplan={onReplan}
            canWrite={canWrite}
            writeHint={writeHint}
          />
        ))}
      </ul>
    )}
  </Card>
);

/** Los próximos vencimientos proyectados de la flota, con el uso real que explica cada fecha. */
export const PlannerForecastTab = () => {
  const { canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = usePlannerForecast();
  const replan = useReplanTask();
  const [forcing, setForcing] = useState<Forcing | null>(null);

  const handleReplan = async (item: ForecastItem) => {
    const ok = await confirm({
      title: '¿Re-planificar la tarea?',
      text: `${item.taskName}: se descarta el caso abierto, si lo hay, y se vuelve a proponer la mejor ventana al chofer.`,
      confirmText: 'Re-planificar',
    });
    if (!ok) return;
    replan.mutate(item.taskId, {
      onSuccess: () => notify.success('Tarea re-planificada'),
      onError: notify.error,
    });
  };

  if (error) return <ErrorState error={error} resource="Los vencimientos proyectados" onRetry={() => void refetch()} />;
  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (data.vehicles.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Sin vencimientos para proyectar"
          description="Ningún vehículo tiene tareas abiertas de mantenimiento o habilitación."
        />
      </Card>
    );
  }
  return (
    <>
      <ul className="space-y-4">
        {data.vehicles.map((vehicle) => (
          <li key={vehicle.carId}>
            <VehicleCard
              vehicle={vehicle}
              onForce={setForcing}
              onReplan={(item) => void handleReplan(item)}
              canWrite={canWrite}
              writeHint={writeHint}
            />
          </li>
        ))}
      </ul>
      {forcing && (
        <WindowFormModal
          mode="force"
          taskId={forcing.taskId}
          taskName={forcing.taskName}
          patent={forcing.patent}
          onClose={() => setForcing(null)}
        />
      )}
    </>
  );
};
