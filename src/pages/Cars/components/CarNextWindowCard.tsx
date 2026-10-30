import { Link } from 'react-router-dom';
import { Card, CardHeader, EmptyState, LoadingState, Badge } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { usePlannerForecast } from '../../../services/queries/planner';
import { PLANNING_CASE_STATUS, formatWindow } from '../../Fleet/Planner/plannerLabels';

/** La próxima ventana de taller del vehículo (CU-105), con lo que falta para que se programe. */
export const CarNextWindowCard = ({ carId }: { carId: string }) => {
  const { needsDistributor } = usePermissions();
  const { data, isPending, error } = usePlannerForecast(carId, { enabled: !needsDistributor });
  const vehicle = data?.vehicles.find((v) => v.carId === carId);
  const next = vehicle?.nextWindow ?? null;

  return (
    <Card className="p-6">
      <CardHeader
        title="Próxima ventana de taller"
        className="mb-4"
        action={
          <Link className="text-sm font-semibold text-primary-strong hover:underline" to="/fleet/planner?tab=forecast">
            Planificador
          </Link>
        }
      />
      {needsDistributor ? (
        <EmptyState title="Elegí una distribuidora" description="Elegí una con «Ver como» para ver su planificador." />
      ) : isPending ? (
        <LoadingState label="Buscando la ventana…" />
      ) : error ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo consultar el planificador.
        </p>
      ) : next ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline p-3">
          <span className="text-sm text-ink">{formatWindow(next.start, next.end)}</span>
          <Badge label={PLANNING_CASE_STATUS[next.status]} />
        </div>
      ) : (
        <EmptyState
          title="Sin ventana de taller"
          description="El planificador propone una cuando una tarea de mantenimiento entra en su anticipación."
        />
      )}
    </Card>
  );
};
