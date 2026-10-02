import { Badge, Modal } from '../../../common/components/ui';
import type { AsientoDeAuditoria } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { AUDIT_RESULT, labelOf } from '../../../utils/statusLabels';

interface Props {
  entry: AsientoDeAuditoria | null;
  onClose: () => void;
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-semibold uppercase text-muted">{label}</p>
    <p className="break-words text-sm text-ink">{value || '—'}</p>
  </div>
);

/** Detalle de un asiento de auditoría, con los cambios que mandó la operación. */
export const AuditDetailModal = ({ entry, onClose }: Props) => (
  <Modal open={Boolean(entry)} onClose={onClose} title="Detalle de la operación" size="md">
    {entry && (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Fecha" value={formatDateTime(entry.createdAt)} />
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Resultado</p>
            <Badge className="mt-1" label={labelOf(AUDIT_RESULT, entry.result)} />
          </div>
          <Field label="Código HTTP" value={String(entry.statusCode)} />
          <Field label="Autor" value={entry.actorRole ?? 'Sistema'} />
          <Field label="user_id del autor" value={entry.actorUserId ?? '—'} />
          <Field label="Origen" value={`${entry.clientSource ?? '—'} · ${entry.ip ?? '—'}`} />
          <Field label="Recurso" value={entry.resource} />
          <Field label="ID del recurso" value={entry.resourceId ?? '—'} />
          <Field label="Distribuidora" value={entry.distributorId ?? '—'} />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted">Operación</p>
          <p className="rounded-lg bg-surface-hover px-3 py-2 font-mono text-sm text-ink">
            {entry.httpMethod} {entry.path}
          </p>
        </div>

        {entry.errorMessage && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Error</p>
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{entry.errorMessage}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted">Cambios</p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-surface-hover px-3 py-2 text-xs text-ink">
            {entry.changes ? JSON.stringify(entry.changes, null, 2) : 'Sin datos'}
          </pre>
        </div>
      </div>
    )}
  </Modal>
);
