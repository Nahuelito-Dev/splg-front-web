import { Badge, DetailList, EmptyState, LoadingState, Modal } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { useCylinderHistory } from '../../../services/queries/physicalCylinders';
import { formatCurrency, formatDate, formatDateTime, formatShortId } from '../../../utils/format';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  cylinder: Cylinder | null;
}

/** Todo lo del envase (CylinderResponseDto) y su historial de movimientos. */
export const CylinderDetailModal = ({ open, onClose, cylinder }: Props) => {
  const { data: movements, isPending } = useCylinderHistory(cylinder?.cylinder_id, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={cylinder ? `Envase ${cylinder.serial}` : 'Envase'}
      description={
        cylinder?.gas_cylinder ? `${cylinder.gas_cylinder.type} · ${cylinder.gas_cylinder.weight} kg` : undefined
      }
      footer={cylinder && <Badge label={labelOf(CYLINDER_STATE, cylinder.state)} />}
    >
      {cylinder && (
        <DetailList
          className="mb-6"
          items={[
            {
              label: 'En poder de',
              value: cylinder.current_customer
                ? `${cylinder.current_customer.full_name ?? 'Cliente sin nombre'}${
                    cylinder.current_customer.phone_number ? ` · ${cylinder.current_customer.phone_number}` : ''
                  }`
                : 'La distribuidora',
            },
            {
              label: 'Pedido actual',
              value: cylinder.current_order_id ? formatShortId(cylinder.current_order_id) : '—',
              mono: Boolean(cylinder.current_order_id),
            },
            {
              label: 'Garantía',
              value: cylinder.deposit > 0 ? formatCurrency(cylinder.deposit) : 'Sin garantía',
              mono: cylinder.deposit > 0,
            },
            { label: 'Fabricación', value: formatDate(cylinder.manufactured_at) },
            { label: 'Última inspección', value: formatDate(cylinder.last_inspection_at) },
            { label: 'Alta', value: formatDateTime(cylinder.createdAt) },
          ]}
        />
      )}
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Movimientos</h3>
      {isPending ? (
        <LoadingState />
      ) : !movements || movements.length === 0 ? (
        <EmptyState title="Sin movimientos" description="Todavía no se registraron transiciones para este envase." />
      ) : (
        <ol className="relative ml-2 space-y-6 border-l border-outline">
          {movements.map((m) => (
            <li key={m.movement_id} className="ml-4">
              <span
                aria-hidden="true"
                className="absolute -left-1.5 h-3 w-3 rounded-full border border-surface bg-primary"
              />
              <div className="flex flex-wrap items-center gap-2">
                {m.from_state && <Badge label={labelOf(CYLINDER_STATE, m.from_state)} />}
                {m.from_state && (
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                )}
                <Badge label={labelOf(CYLINDER_STATE, m.to_state)} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatDateTime(m.createdAt)}
                {m.order_id ? ` · Pedido ${formatShortId(m.order_id)}` : ''}
              </p>
              {m.note && <p className="mt-1 text-sm text-ink">{m.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
};
