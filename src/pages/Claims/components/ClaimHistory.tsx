import { useState } from 'react';
import { Badge, EmptyState, LoadingState } from '../../../common/components/ui';
import { useAudit } from '../../../services/queries/audit';
import { formatDateTime } from '../../../utils/format';
import { AUDIT_RESULT, labelOf } from '../../../utils/statusLabels';
import { actorLabel, claimHistoryLabel } from './claimHistoryLabel';

interface Props {
  claimId: string;
  /** Fecha de alta del reclamo: el audit no guarda el alta (`POST /claims` no trae el id), así que se agrega acá. */
  createdAt: string;
}

/**
 * `claims` no guarda su propio historial de estados: lo que se ve acá sale
 * de `GET /audit` filtrado por este reclamo (`resource: 'claims'`), que registra
 * las escrituras sobre un reclamo existente (tomar, resolver, rechazar, reabrir,
 * foto) con su autor y resultado — CU-153. El alta se agrega con la fecha del reclamo.
 * Por defecto se ven los movimientos que surtieron efecto; los intentos fallidos se despliegan aparte.
 */
export const ClaimHistory = ({ claimId, createdAt }: Props) => {
  const [showFailed, setShowFailed] = useState(false);
  const { data, isPending, error } = useAudit({ resource: 'claims', resourceId: claimId, limit: 50, offset: 0 });

  if (isPending) return <LoadingState label="Cargando historial…" />;
  if (error || !data) {
    return <EmptyState title="Sin historial" description="No se pudo cargar el historial de este reclamo." />;
  }

  const failedCount = data.rows.filter((entry) => entry.result === 'failure').length;
  const rows = showFailed ? data.rows : data.rows.filter((entry) => entry.result === 'success');

  return (
    <div className="space-y-4">
      <ol className="relative ml-2 space-y-5 border-l border-outline">
        {rows.map((entry) => (
          <li key={entry.auditId} className="ml-4">
            <span
              aria-hidden="true"
              className="absolute -left-1.5 h-3 w-3 rounded-full border border-surface bg-primary"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink">{claimHistoryLabel(entry)}</span>
              {entry.result === 'failure' && <Badge label={labelOf(AUDIT_RESULT, entry.result)} />}
            </div>
            <p className="mt-1 text-xs text-muted">
              {actorLabel(entry.actorRole)} · {formatDateTime(entry.createdAt)}
            </p>
          </li>
        ))}
        <li className="ml-4">
          <span
            aria-hidden="true"
            className="absolute -left-1.5 h-3 w-3 rounded-full border border-surface bg-primary"
          />
          <span className="text-sm font-medium text-ink">Se registró el reclamo</span>
          <p className="mt-1 text-xs text-muted">{formatDateTime(createdAt)}</p>
        </li>
      </ol>
      {failedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowFailed((value) => !value)}
          aria-expanded={showFailed}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showFailed ? 'Ocultar intentos fallidos' : `Mostrar intentos fallidos (${failedCount})`}
        </button>
      )}
    </div>
  );
};
