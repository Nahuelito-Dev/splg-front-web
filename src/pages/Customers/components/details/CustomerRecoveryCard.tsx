import { Link } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, ListSkeleton } from '../../../../common/components/ui';
import { useRecoveryCases } from '../../../../services/queries/recovery';
import { formatCurrencyExact, formatDate } from '../../../../utils/format';
import {
  RECOVERY_CASE_STATUS,
  nextStepText,
  recoveryStepText,
} from '../../../PhysicalCylinders/Recovery/recoveryLabels';

const LIMIT = 50;

/** Los envases que este cliente no devolvió a tiempo y cómo va la gestión de cada uno (CU-108): sus casos abiertos. */
export const CustomerRecoveryCard = ({ userId }: { userId: string }) => {
  const { data, isPending, error } = useRecoveryCases({ page: 0, pageSize: LIMIT }, { customerId: userId, live: true });
  const live = data?.data ?? [];

  return (
    <Card>
      <CardHeader title="Envases sin devolver a tiempo" className="border-b border-outline p-4" />
      {isPending ? (
        <ListSkeleton rows={2} columns={3} />
      ) : error ? (
        <p className="p-4 text-sm text-danger" role="alert">
          No se pudieron cargar los casos de recupero.
        </p>
      ) : live.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Sin casos abiertos"
          description="Ningún envase de este cliente pasó la tolerancia de devolución."
        />
      ) : (
        <ul className="divide-y divide-outline-soft">
          {live.map((c) => (
            <li key={c.caseId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0">
                <Link
                  to={`/physical-cylinders/recovery?case=${c.caseId}`}
                  className="block truncate font-mono text-sm font-medium text-primary-strong hover:underline"
                >
                  {c.cylinder.serial}
                </Link>
                <span className="block truncate text-xs text-muted">
                  {recoveryStepText(c.step)} · entregado el {formatDate(c.deliveredAt)} · {nextStepText(c)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-sm text-ink">{formatCurrencyExact(c.depositAmount)}</span>
                <Badge label={RECOVERY_CASE_STATUS[c.status]} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
