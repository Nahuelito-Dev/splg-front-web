import { Badge, EmptyState, LoadingState } from '../../../common/components/ui';
import { useAudit } from '../../../services/queries/audit';
import { formatDateTime } from '../../../utils/format';
import { AUDIT_RESULT, labelOf } from '../../../utils/statusLabels';

interface Props {
  claimId: string;
}

/**
 * `claims` no guarda su propio historial de estados: lo que se ve acá sale
 * de `GET /audit` filtrado por este reclamo (`resource: 'claims'`), que ya
 * registra toda escritura (alta, tomar, resolver, rechazar, reabrir) con su
 * autor y resultado — CU-153.
 */
export const ClaimHistory = ({ claimId }: Props) => {
  const { data, isPending, error } = useAudit({ resource: 'claims', resourceId: claimId, limit: 20, offset: 0 });

  if (isPending) return <LoadingState label="Cargando historial…" />;
  if (error || !data || data.rows.length === 0) {
    return <EmptyState title="Sin historial" description="Todavía no hay movimientos registrados para este reclamo." />;
  }

  return (
    <ol className="relative ml-2 space-y-5 border-l border-outline">
      {data.rows.map((entry) => (
        <li key={entry.auditId} className="ml-4">
          <span
            aria-hidden="true"
            className="absolute -left-1.5 h-3 w-3 rounded-full border border-surface bg-primary"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink">
              {entry.httpMethod} {entry.path}
            </span>
            <Badge label={labelOf(AUDIT_RESULT, entry.result)} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDateTime(entry.createdAt)} · {entry.actorRole ?? 'Sistema'}
          </p>
          {entry.errorMessage && <p className="mt-1 text-xs text-danger">{entry.errorMessage}</p>}
        </li>
      ))}
    </ol>
  );
};
