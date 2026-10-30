import { useState } from 'react';
import { Badge, Button, IdentityCell, SearchInput } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import type { Order } from '../../../services/api/types';
import { useOrders } from '../../../services/queries/orders';
import { formatCurrency, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';

interface Props {
  selected: Order | null;
  onSelect: (order: Order | null) => void;
}

/** Buscar el pedido a reenviarle la confirmación (CU-101), por número o por datos del cliente. */
export const OrderPicker = ({ selected, onSelect }: Props) => {
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounce(term);
  const canSearch = debouncedTerm.trim().length >= 2;
  const { data, isFetching } = useOrders({ page: 0, pageSize: 6 }, { search: debouncedTerm }, { enabled: canSearch });

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-hover p-3">
        <IdentityCell
          title={selected.customer?.full_name ?? 'Cliente sin nombre'}
          subtitle={`Pedido ${formatShortId(selected.order_id)} · ${formatCurrency(selected.total_amount)}`}
          avatarName={selected.customer?.full_name ?? '?'}
          person={{ userId: selected.customer?.user_id }}
        />
        <div className="flex items-center gap-2">
          <Badge label={labelOf(ORDER_STATUS, selected.status)} />
          <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  const results = canSearch ? (data?.orders ?? []) : [];

  return (
    <div className="space-y-2">
      <SearchInput
        label="Buscar pedido por número, cliente o teléfono"
        placeholder="Buscar pedido por número, cliente o teléfono…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {canSearch && (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-outline p-1.5">
          {isFetching && <p className="px-2 py-1.5 text-xs text-muted">Buscando…</p>}
          {!isFetching && results.length === 0 && <p className="px-2 py-1.5 text-xs text-muted">Sin resultados.</p>}
          {results.map((order) => (
            <button
              key={order.order_id}
              type="button"
              onClick={() => onSelect(order)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-hover"
            >
              <IdentityCell
                title={order.customer?.full_name ?? 'Cliente sin nombre'}
                subtitle={`Pedido ${formatShortId(order.order_id)} · ${formatCurrency(order.total_amount)}`}
                avatarName={order.customer?.full_name ?? '?'}
                person={{ userId: order.customer?.user_id }}
              />
              <Badge label={labelOf(ORDER_STATUS, order.status)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
