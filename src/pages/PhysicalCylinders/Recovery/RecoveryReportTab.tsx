import { Cylinder, Gavel, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, EmptyState, ErrorState, KpiCard, ListSkeleton } from '../../../common/components/ui';
import type { RecoveryCase } from '../../../services/api/types';
import { useRecoveryReport } from '../../../services/queries/recovery';
import { formatCurrencyExact } from '../../../utils/format';
import { MANUAL_REVIEW_REASON, RECOVERY_CASE_STATUS, nextStepText } from './recoveryLabels';

const CaseList = ({ cases, empty }: { cases: RecoveryCase[]; empty: string }) =>
  cases.length === 0 ? (
    <p className="p-4 text-sm text-muted">{empty}</p>
  ) : (
    <ul className="divide-y divide-outline-soft">
      {cases.map((c) => (
        <li key={c.caseId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <Link
              to={`/physical-cylinders/recovery?case=${c.caseId}`}
              className="block truncate font-mono text-sm font-medium text-primary-strong hover:underline"
            >
              {c.cylinder.serial}
            </Link>
            <span className="block truncate text-xs text-muted">
              {c.customer.fullName ?? 'Sin nombre'} · {c.daysOut} días en su poder
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-ink">{formatCurrencyExact(c.depositAmount)}</span>
            <Badge label={RECOVERY_CASE_STATUS[c.status]} />
          </div>
          <span className="w-full text-xs text-muted">{nextStepText(c)}</span>
        </li>
      ))}
    </ul>
  );

/**
 * El reporte de la distribuidora (CU-108, excepciones 2, 10 y 11): los envases perdidos que el sistema sólo informa,
 * los casos escalados que el administrador todavía no resolvió y los envases cuyo titular no se puede determinar.
 */
export const RecoveryReportTab = () => {
  const { data, isPending, error, refetch } = useRecoveryReport();
  if (error && !data) {
    return <ErrorState error={error} resource="El reporte de envases" onRetry={() => void refetch()} />;
  }
  const totals = data?.totals;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          title="Envases perdidos"
          icon={SearchX}
          loading={isPending}
          value={totals ? String(totals.lostCount) : '–'}
          hint={totals ? `${formatCurrencyExact(totals.lostAmount)} en depósitos` : undefined}
        />
        <KpiCard
          title="Esperan tu decisión"
          icon={Gavel}
          loading={isPending}
          value={totals ? String(totals.escalatedCount) : '–'}
          hint={totals ? `${formatCurrencyExact(totals.escalatedAmount)} en juego` : undefined}
        />
        <KpiCard
          title="Para revisión manual"
          icon={Cylinder}
          loading={isPending}
          value={totals ? String(totals.manualReviewCount) : '–'}
          hint="Con cliente, pero sin dato de quién ni desde cuándo"
        />
      </div>
      <Card>
        <CardHeader title="Casos escalados sin resolver" className="border-b border-outline p-4" />
        {isPending ? (
          <ListSkeleton rows={3} columns={3} />
        ) : (
          <CaseList cases={data?.escalated ?? []} empty="No hay casos esperando tu decisión." />
        )}
      </Card>
      <Card>
        <CardHeader title="Envases perdidos" className="border-b border-outline p-4" />
        {isPending ? (
          <ListSkeleton rows={3} columns={3} />
        ) : (
          <CaseList
            cases={data?.lost ?? []}
            empty="No hay envases perdidos: ningún caso agotó sus avisos con un depósito bajo el umbral."
          />
        )}
      </Card>
      <Card>
        <CardHeader title="Envases para revisión manual" className="border-b border-outline p-4" />
        {isPending ? (
          <ListSkeleton rows={2} columns={2} />
        ) : (data?.manualReview.length ?? 0) === 0 ? (
          <EmptyState
            title="Nada para revisar"
            description="Todos los envases en poder de un cliente tienen su titular y su fecha de entrega."
          />
        ) : (
          <ul className="divide-y divide-outline-soft">
            {data?.manualReview.map((m) => (
              <li key={m.cylinderId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link
                  to={`/physical-cylinders/${m.cylinderId}`}
                  className="font-mono text-sm font-medium text-primary-strong hover:underline"
                >
                  {m.serial}
                </Link>
                <span className="text-xs text-muted">{MANUAL_REVIEW_REASON[m.reason]}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
