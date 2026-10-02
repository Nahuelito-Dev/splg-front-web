import { RotateCw } from 'lucide-react';
import { Badge, Card, ErrorState, IconButton, LoadingState } from '../../../common/components/ui';
import type { HealthReport } from '../../../services/api/health';
import { useHealth, useReadiness, type TimedHealthReport } from '../../../services/queries/health';
import { formatDateTime } from '../../../utils/format';
import { HEALTH_STATUS, labelOf } from '../../../utils/statusLabels';

/** Nombre legible de cada dependencia que arma Terminus en el back. */
const DEPENDENCY_NAME: Record<string, string> = {
  postgres: 'Base de datos (PostgreSQL)',
  redis: 'Redis (cache, rate-limit, sesiones de link)',
  memory_rss: 'Memoria del proceso (RSS < 300 MB)',
  storage: 'Disco (>10% libre)',
};

type Entry = { status: string; message?: string };

const isUp = (status: string): status is 'up' | 'down' => status === 'up' || status === 'down';

const DependencyRow = ({ id, entry }: { id: string; entry: Entry }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-hover px-3.5 py-2.5">
    <div className="min-w-0">
      <p className="truncate text-[13px] font-medium text-ink">{DEPENDENCY_NAME[id] ?? id}</p>
      {entry.message && <p className="truncate text-xs text-muted">{entry.message}</p>}
    </div>
    <Badge label={labelOf(HEALTH_STATUS, isUp(entry.status) ? entry.status : undefined)} />
  </div>
);

interface SectionProps {
  title: string;
  description: string;
  data?: TimedHealthReport;
  isLoading: boolean;
  error: unknown;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Una sección del chequeo (readiness o health completo). Terminus contesta
 * 200 cuando todo está `up` y 503 cuando algo falla, pero en los dos casos
 * el cuerpo trae `details` por dependencia: `getHealth`/`getReadiness` ya lo
 * leen igual pase lo que pase, así que acá sólo se pinta.
 */
const HealthSection = ({ title, description, data, isLoading, error, onRefresh, refreshing }: SectionProps) => {
  const report: HealthReport | undefined = data?.report;
  const details = report?.details ?? {};
  const entries = Object.entries(details) as [string, Entry][];
  const overallUp = report?.status === 'ok';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {report && <Badge label={labelOf(HEALTH_STATUS, overallUp ? 'up' : 'down')} />}
          <IconButton
            label={`Actualizar ${title.toLowerCase()}`}
            icon={<RotateCw className={refreshing ? 'animate-spin' : undefined} />}
            onClick={onRefresh}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Consultando…" />
      ) : error && !report ? (
        <ErrorState error={error} resource="El chequeo" onRetry={onRefresh} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {entries.map(([id, entry]) => (
              <DependencyRow key={id} id={id} entry={entry} />
            ))}
          </div>
          {data && (
            <p className="text-xs text-muted">
              Respondió en {data.ms} ms · {formatDateTime(data.fetchedAt)}
            </p>
          )}
        </>
      )}
    </div>
  );
};

/**
 * `GET /health/ready` (postgres + redis: lo mínimo para atender tráfico) y
 * `GET /health` (eso más memoria y disco). Hay un 503 conocido: cuando algo
 * está caído la API lo devuelve así a propósito (para que un load balancer
 * saque la instancia de servicio), así que se muestra como lo que es —un
 * estado, no un error del panel— en vez de taparlo con un mensaje genérico.
 */
export const SystemHealthCard = () => {
  const ready = useReadiness();
  const health = useHealth();

  return (
    <Card className="space-y-6 p-5">
      <HealthSection
        title="Listo para tráfico"
        description="/health/ready — lo mínimo para atender pedidos: base de datos y Redis."
        data={ready.data}
        isLoading={ready.isLoading}
        error={ready.error}
        onRefresh={() => void ready.refetch()}
        refreshing={ready.isFetching}
      />
      <div className="border-t border-outline" />
      <HealthSection
        title="Chequeo completo"
        description="/health — además de la base y Redis, memoria y disco del proceso."
        data={health.data}
        isLoading={health.isLoading}
        error={health.error}
        onRefresh={() => void health.refetch()}
        refreshing={health.isFetching}
      />
      <p className="text-xs text-muted">
        Se actualiza solo cada 30 segundos. El tiempo de respuesta es de la llamada completa: la API no informa latencia
        por dependencia.
      </p>
    </Card>
  );
};
