import { Tabs, type TabItem } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { labelOf, ORDER_FLOW, ORDER_STATUS } from '../../../utils/statusLabels';

const ALL = 'all';

interface Props {
  value: Order['status'] | '';
  /** Cantidad por estado; `null` mientras no hay dato (no se muestra como 0). */
  counts: Record<Order['status'], number | null>;
  /** Suma de todos; `null` si falta alguno. */
  total: number | null;
  onChange: (value: Order['status'] | '') => void;
}

/** Id del panel que muestran las pestañas: el contenido de Pedidos lo envuelve con `tabPanelProps`. */
export const ORDER_TABS_ID = 'orders';

/** Pestañas de Pedidos por estado, con la cantidad de cada una (GET /orders?status=). */
export const OrderStatusTabs = ({ value, counts, total, onChange }: Props) => {
  const items: TabItem[] = [
    { id: ALL, label: 'Todos', count: total },
    ...ORDER_FLOW.map((status) => ({
      id: status,
      label: labelOf(ORDER_STATUS, status).text,
      count: counts[status],
      tone: labelOf(ORDER_STATUS, status).tone,
    })),
  ];

  return (
    <Tabs
      items={items}
      value={value || ALL}
      onChange={(id) => onChange(id === ALL ? '' : (id as Order['status']))}
      label="Filtrar pedidos por estado"
      idPrefix={ORDER_TABS_ID}
    />
  );
};
