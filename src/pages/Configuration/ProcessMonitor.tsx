import { Activity, TriangleAlert } from 'lucide-react';
import { CardHeader, EmptyState, ErrorState, PageContainer, PageHeader, Skeleton } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useDistributors } from '../../services/queries/distributors';
import { useProcessSummary } from '../../services/queries/processRuns';
import { ProcessCard } from './components/ProcessCard';
import { ProcessRunsHistory } from './components/ProcessRunsHistory';
import { needsAttention, sortByAttention } from './processMonitorRules';

/**
 * Monitoreo de los procesos automáticos (F31): la última corrida de cada uno con su salud (al día, con errores,
 * falló, atrasado, colgado), lo que generó y cuándo se espera la próxima, más el historial de corridas. El admin
 * ve su distribuidora; el administrador general ve todas o la que elija con «Ver como».
 */
export const ProcessMonitor = () => {
  const { isSuperAdmin, needsDistributor } = usePermissions();
  const { data, isPending, error, refetch } = useProcessSummary();
  // Sin «Ver como», el administrador general ve corridas de varias empresas: se rotula cada una.
  const { data: distributors } = useDistributors(isSuperAdmin);
  const nameOf = (id: string | null) =>
    id ? (distributors?.find((d) => d.distributor_id === id)?.name ?? 'Otra distribuidora') : undefined;

  const items = sortByAttention(data?.items ?? []);
  const alerts = items.filter(needsAttention).length;

  return (
    <PageContainer stack>
      <PageHeader
        title="Monitoreo de procesos"
        description="Cómo les fue a las tareas que el sistema ejecuta solo: última corrida, resultado, lo que generaron y cuándo toca la próxima."
      />
      {isSuperAdmin && needsDistributor && (
        <p className="text-sm text-muted">
          Estás viendo todas las distribuidoras. Elegí una en «Ver como» para ver sólo la suya.
        </p>
      )}

      {error ? (
        <ErrorState error={error} resource="Los procesos automáticos" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div role="status" aria-label="Cargando procesos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No hay procesos para mostrar" description="La API no devolvió ningún proceso." />
      ) : (
        <>
          {alerts > 0 && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
            >
              <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
              {alerts === 1
                ? '1 proceso necesita atención: está atrasado, falló o quedó colgado.'
                : `${alerts} procesos necesitan atención: están atrasados, fallaron o quedaron colgados.`}
            </div>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={`${item.process}:${item.distributorId ?? ''}`}>
                <ProcessCard item={item} distributorName={needsDistributor ? nameOf(item.distributorId) : undefined} />
              </li>
            ))}
          </ul>
          <CardHeader
            title="Historial de corridas"
            subtitle="Cada ejecución registrada, con su resultado y lo que generó."
            icon={<Activity />}
            className=""
          />
          <ProcessRunsHistory processes={items} />
        </>
      )}
    </PageContainer>
  );
};
