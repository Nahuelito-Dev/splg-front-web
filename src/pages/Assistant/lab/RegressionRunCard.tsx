import { useEffect } from 'react';
import { CircleCheck, CircleHelp, CircleX, ListChecks, Play } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  Skeleton,
} from '../../../common/components/ui';
import { errorMessage, toApiError } from '../../../services/api/errors';
import type { RegressionRun } from '../../../services/api/types';
import { useLastRegressionRun, useRunRegression } from '../../../services/queries/assistantLab';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { labelOf, REGRESSION_RUN_STATUS } from '../../../utils/statusLabels';
import { FaqFormError } from '../components/FormError';
import { RegressionResults } from './RegressionResults';
import { runProgress } from './labRules';

interface Props {
  /** Puede correr el lote (`asistente.gestionar`, fuera del modo soporte). */
  canRun: boolean;
  /** Por qué no se puede correr ahora (sin casos, modo soporte). */
  runBlockedReason?: string;
}

const Progress = ({ run }: { run: RegressionRun }) => {
  const { done, percent } = runProgress(run);
  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label="Avance de la corrida"
        aria-valuemin={0}
        aria-valuemax={run.total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted" aria-live="polite">{`${done} de ${run.total} casos`}</p>
    </div>
  );
};

const Summary = ({ run }: { run: RegressionRun }) => (
  <KpiGrid label="Resumen de la corrida" className="sm:grid-cols-4">
    <KpiCard title="Casos" icon={ListChecks} value={formatNumber(run.total)} />
    <KpiCard title="Pasaron" icon={CircleCheck} value={formatNumber(run.passed)} />
    <KpiCard title="No pasaron" icon={CircleX} value={formatNumber(run.failed)} />
    <KpiCard title="Sin juzgar" icon={CircleHelp} value={formatNumber(run.errored)} />
  </KpiGrid>
);

const RunBody = ({ run }: { run: RegressionRun }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
      <Badge label={labelOf(REGRESSION_RUN_STATUS, run.status)} />
      <span>{`Empezó ${formatDateTime(run.startedAt)}`}</span>
      {run.finishedAt && <span>{`· Terminó ${formatDateTime(run.finishedAt)}`}</span>}
    </div>
    {run.status === 'running' && <Progress run={run} />}
    {run.status === 'failed' && (
      <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
        La corrida se cortó antes de terminar. Lo que alcanzó a correr está abajo; podés volver a correrla.
      </p>
    )}
    <Summary run={run} />
    <RegressionResults results={run.results} />
  </div>
);

/** Correr el lote y ver la última corrida: avance mientras está en curso y el resultado de cada caso al terminar. */
export const RegressionRunCard = ({ canRun, runBlockedReason }: Props) => {
  const last = useLastRegressionRun();
  const run = useRunRegression();
  const neverRun = !last.data && toApiError(last.error).notFound;
  const running = last.data?.status === 'running';
  const lastId = last.data?.id;
  const lastStatus = last.data?.status;
  const { reset } = run;
  // Un 409 (otra corrida en curso) o un 429 (enfriamiento) deja de valer cuando la última corrida cambia.
  useEffect(() => {
    reset();
  }, [lastId, lastStatus, reset]);

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <CardHeader
        title="Última corrida"
        subtitle="Corre todos los casos con la base de hoy. Se puede correr una vez cada 10 minutos."
        as="h2"
        className=""
        action={
          canRun && (
            <Button
              icon={<Play aria-hidden="true" />}
              loading={run.isPending}
              blockedReason={running ? 'Hay una corrida en curso' : runBlockedReason}
              onClick={() => run.mutate()}
            >
              Correr
            </Button>
          )
        }
      />
      <FaqFormError message={run.error ? errorMessage(run.error) : null} />
      {last.isPending ? (
        <div role="status" aria-label="Cargando la última corrida" className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : last.data ? (
        <RunBody run={last.data} />
      ) : neverRun ? (
        <EmptyState
          icon={ListChecks}
          title="Todavía no se corrió el lote"
          description="Cargá los casos y tocá «Correr» para ver cuáles pasan."
        />
      ) : (
        <ErrorState error={last.error} resource="La última corrida" onRetry={() => void last.refetch()} />
      )}
    </Card>
  );
};
