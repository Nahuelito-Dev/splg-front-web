import { Badge, DetailList, Drawer } from '../../../common/components/ui';
import type { AuditEntry } from '../../../services/api/types';
import { auditActionLabel, auditEntityLabel } from '../../../utils/auditLabels';
import { formatDateTime } from '../../../utils/format';

interface Props {
  entry: AuditEntry | null;
  onClose: () => void;
}

const Value = ({ value }: { value: string | null }) =>
  value === null ? <span className="text-muted">—</span> : <span className="break-all">{value}</span>;

/** Qué cambió en un registro: cada campo con su valor anterior y el nuevo. */
export const DataAuditDrawer = ({ entry, onClose }: Props) => (
  <Drawer
    open={Boolean(entry)}
    onClose={onClose}
    title="Detalle del cambio"
    description={entry ? `${auditEntityLabel(entry.entity)} · ${formatDateTime(entry.dateTime)}` : undefined}
    size="lg"
  >
    {entry && (
      <div className="space-y-5">
        <DetailList
          items={[
            { label: 'Acción', value: <Badge label={auditActionLabel(entry.actionType)} /> },
            { label: 'Entidad', value: auditEntityLabel(entry.entity) },
            { label: 'Id del registro', value: entry.recordId, mono: true, wide: true },
            {
              label: 'Autor',
              value: entry.user
                ? `${entry.user.fullName ?? entry.user.email ?? entry.user.userId}${entry.user.deleted ? ' (dado de baja)' : ''}`
                : 'Sistema',
            },
            { label: 'IP', value: entry.ip, mono: true },
            { label: 'Distribuidora', value: entry.distributorId, mono: true, wide: true },
          ]}
        />

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Campos ({entry.details.length})</h3>
          {entry.details.length === 0 ? (
            <p className="text-sm text-muted">Esta entrada no tiene campos.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-hover text-xs uppercase text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Campo
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Valor anterior
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Valor nuevo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.details.map((detail) => (
                    <tr key={detail.auditDetailId} className="border-t border-outline align-top">
                      <th scope="row" className="px-3 py-2 font-mono text-[12px] font-medium text-ink">
                        {detail.field}
                      </th>
                      <td className="px-3 py-2 text-ink-2">
                        <Value value={detail.oldValue} />
                      </td>
                      <td className="px-3 py-2 text-ink">
                        <Value value={detail.newValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
  </Drawer>
);
