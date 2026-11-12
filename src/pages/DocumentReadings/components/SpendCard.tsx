import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, ErrorState, Skeleton } from '../../../common/components/ui';
import { useDocumentReadingSpend } from '../../../services/queries/documentReadings';
import { useProcessConfigs } from '../../../services/queries/moduleConfig';
import { formatUsd } from '../../../utils/format';
import { spentPercent } from '../documentReadingRules';

/** El gasto del mes en lecturas contra el tope, si el lector está configurado y si la lectura automática está prendida. */
export const SpendCard = () => {
  const spend = useDocumentReadingSpend();
  const processes = useProcessConfigs();
  const config = processes.data?.find((p) => p.process === 'document_reading');
  const budget = config?.params.monthlyBudgetUsd ?? null;
  const enabled = config ? config.params.enabled === 1 : null;
  const percent = spend.data ? spentPercent(spend.data.costUsd, budget) : null;

  return (
    <Card className="p-5">
      <CardHeader
        title="Gasto del mes"
        subtitle="Lo que costaron las lecturas de este mes (hora argentina), incluidas las que fallaron."
        icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
        badge={
          spend.data &&
          (spend.data.available ? (
            <Badge label={{ text: 'Lector configurado', tone: 'success' }} />
          ) : (
            <Badge label={{ text: 'Lector sin configurar', tone: 'danger' }} />
          ))
        }
      />
      {spend.error ? (
        <ErrorState error={spend.error} resource="El gasto del mes" onRetry={() => void spend.refetch()} />
      ) : !spend.data ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="grid gap-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className="font-mono text-2xl font-semibold text-ink">{formatUsd(spend.data.costUsd)}</strong>
            <span className="text-sm text-muted">
              {budget === null ? 'sin tope cargado' : `de ${formatUsd(budget)} de tope`} · {spend.data.readings}{' '}
              {spend.data.readings === 1 ? 'lectura' : 'lecturas'}
            </span>
          </p>
          {percent !== null && (
            <div
              role="progressbar"
              aria-label="Tope de gasto usado"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 overflow-hidden rounded-full bg-outline-soft"
            >
              <div
                className={percent >= 90 ? 'h-full bg-danger' : percent >= 70 ? 'h-full bg-warn' : 'h-full bg-primary'}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {!spend.data.available && (
            <p className="text-sm text-muted">
              El servicio de lectura no está configurado: los documentos quedan en cola y no se puede leer ahora.
            </p>
          )}
          {enabled === false && (
            <p className="text-sm text-muted">
              La lectura automática está apagada. Se enciende en{' '}
              <Link to="/settings/automatic-processes" className="font-medium text-primary underline">
                Procesos automáticos
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
