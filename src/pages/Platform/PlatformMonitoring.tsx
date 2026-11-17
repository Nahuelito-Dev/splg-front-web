import { Activity, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  Skeleton,
} from '../../common/components/ui';
import { useUrlParam } from '../../hooks';
import type { PlatformProcess } from '../../services/api/types';
import { useAllPlatformCompanies, usePlatformProcesses } from '../../services/queries/platformConsole';
import { useProcessSummary } from '../../services/queries/processRuns';
import { formatDateTime, formatNumber } from '../../utils/format';
import { ProcessCard } from '../Configuration/components/ProcessCard';
import { ProcessRunsHistory } from '../Configuration/components/ProcessRunsHistory';
import { formatPeriod, sortByAttention } from '../Configuration/processMonitorRules';
import { CompanySelect } from './components/CompanySelect';
import { healthEntries } from './platformRules';

/** Una fila por proceso: cuántas empresas lo corren, en qué estado están y sus fallas de 24 h. */
const ProcessRow = ({ process }: { process: PlatformProcess }) => {
  const entries = healthEntries(process.health);
  const scope = [
    process.companies > 0 && `${formatNumber(process.companies)} ${process.companies === 1 ? 'empresa' : 'empresas'}`,
    process.global && 'corrida global',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{process.title}</p>
        <p className="text-xs text-muted">
          {process.module ? `${process.module} · ` : ''}
          {formatPeriod(process.expectedEverySeconds)}
          {scope && ` · ${scope}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {entries.length === 0 ? (
          <span className="text-xs text-muted">Sin corridas</span>
        ) : (
          entries.map((entry) => (
            <Badge key={entry.key} label={{ text: `${entry.label.text}: ${entry.count}`, tone: entry.label.tone }} />
          ))
        )}
      </div>
      <div className="text-xs text-muted sm:text-right">
        {process.alerts > 0 && <p className="font-semibold text-danger">{process.alerts} con alerta</p>}
        {process.failuresLast24h > 0 && <p>{process.failuresLast24h} fallas en 24 h</p>}
        <p>{process.lastRunAt ? `Última: ${formatDateTime(process.lastRunAt)}` : 'Nunca corrió'}</p>
      </div>
    </li>
  );
};

/** La salud de cada proceso por empresa (`GET /v2/process-runs/summary`), de todas o de la elegida. */
const CompanySummary = ({ companyId }: { companyId: string }) => {
  const { data, isPending, error, refetch } = useProcessSummary(companyId || undefined);
  const companies = useAllPlatformCompanies();
  // Las empresas llegan todas (de a páginas): una que no está es una dada de baja, no «otra».
  const nameOf = (id: string | null) => {
    if (!id) return 'Todas (global)';
    const found = companies.companies.find((c) => c.id === id);
    if (found) return found.name;
    return companies.loading ? 'Cargando…' : 'Empresa no vigente';
  };
  const items = sortByAttention(data?.items ?? []);

  if (error) return <ErrorState error={error} resource="El resumen de procesos" onRetry={() => void refetch()} />;
  if (isPending) {
    return (
      <div role="status" aria-label="Cargando procesos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState title="Sin procesos para mostrar" description="Todavía no corrió ningún proceso de esta empresa." />
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={`${item.process}:${item.distributorId ?? ''}`}>
          <ProcessCard item={item} distributorName={companyId ? undefined : nameOf(item.distributorId)} />
        </li>
      ))}
    </ul>
  );
};

/**
 * Monitoreo de los procesos automáticos de toda la plataforma (`GET /v2/platform/processes`): por proceso, la salud
 * de las empresas que lo corren; abajo, la de cada empresa y el historial de corridas.
 */
export const PlatformMonitoring = () => {
  const [companyId, setCompanyId] = useUrlParam('company', '');
  const { data, isPending, error, refetch } = usePlatformProcesses();
  // Primero los que tienen alertas, después el resto en el orden de la API.
  const processes = [...(data?.items ?? [])].sort((a, b) => Number(b.alerts > 0) - Number(a.alerts > 0));

  return (
    <PageContainer stack>
      <PageHeader
        title="Monitoreo"
        description="Cómo les va a las tareas que el sistema ejecuta solo, en todas las distribuidoras. Se actualiza cada 30 segundos."
      />

      {error ? (
        <ErrorState error={error} resource="Los procesos automáticos" onRetry={() => void refetch()} />
      ) : isPending ? (
        <LoadingState fullPage label="Cargando los procesos…" />
      ) : (
        <>
          {data.alerts > 0 && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
            >
              <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
              {data.alerts === 1
                ? '1 proceso necesita atención: está atrasado, falló o quedó colgado.'
                : `${data.alerts} procesos necesitan atención: están atrasados, fallaron o quedaron colgados.`}
            </div>
          )}
          <Card className="p-4 sm:p-6">
            <CardHeader
              title="Por proceso"
              subtitle={`Cuántas empresas hay en cada estado. Actualizado el ${formatDateTime(data.generatedAt)}.`}
              icon={<Activity />}
            />
            {processes.length === 0 ? (
              <EmptyState title="Sin procesos" description="La API no devolvió ningún proceso." />
            ) : (
              <ul className="divide-y divide-outline">
                {processes.map((process) => (
                  <ProcessRow key={process.process} process={process} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <section className="min-w-0 space-y-4" aria-label="Por empresa">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <CardHeader
            title="Por empresa"
            subtitle="La última corrida de cada proceso, con lo que generó y cuándo toca la próxima."
            className=""
          />
          <div className="w-full sm:w-72">
            <CompanySelect value={companyId} onChange={setCompanyId} emptyLabel="Todas las empresas" />
          </div>
        </div>
        <CompanySummary companyId={companyId} />
      </section>

      <section className="min-w-0 space-y-4" aria-label="Historial de corridas">
        <CardHeader
          title="Historial de corridas"
          subtitle="Cada ejecución registrada, con su resultado y lo que generó."
          className=""
        />
        <ProcessRunsHistory key={companyId} processes={data?.items ?? []} distributorId={companyId || undefined} />
      </section>
    </PageContainer>
  );
};
