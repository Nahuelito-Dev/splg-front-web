import { Button, Input, SearchInput, Select, type SelectOption } from '../../../common/components/ui';
import { ORDER_STATUS } from '../../../utils/statusLabels';
import { EMPTY_FILTERS, isOrderStatus, ORDER_STATUSES, type OrdersFilterValues } from './ordersFilterValues';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS[status].text })),
];

interface Props {
  values: OrdersFilterValues;
  onChange: (values: OrdersFilterValues) => void;
}

/** Búsqueda y filtros de Pedidos: todos se resuelven en la API (GET /orders). */
export const OrdersFilters = ({ values, onChange }: Props) => {
  const set = (patch: Partial<OrdersFilterValues>) => onChange({ ...values, ...patch });
  const hasFilters = values.search !== '' || values.status !== '' || values.from !== '' || values.to !== '';

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <SearchInput
        label="Buscar pedidos"
        placeholder="Cliente, teléfono o n.º de pedido"
        value={values.search}
        onChange={(e) => set({ search: e.target.value })}
        className="lg:w-80"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:items-end">
        <div className="lg:w-44">
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={values.status}
            onChange={(e) => set({ status: isOrderStatus(e.target.value) ? e.target.value : '' })}
          />
        </div>
        <Input
          label="Desde"
          type="date"
          value={values.from}
          max={values.to || undefined}
          onChange={(e) => set({ from: e.target.value })}
        />
        <Input
          label="Hasta"
          type="date"
          value={values.to}
          min={values.from || undefined}
          onChange={(e) => set({ to: e.target.value })}
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" className="whitespace-nowrap" onClick={() => onChange(EMPTY_FILTERS)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
};
