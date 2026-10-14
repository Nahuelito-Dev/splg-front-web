import { Input, SearchInput, Select } from '../../../common/components/ui';
import { PAYMENT_STATUS_ORDER, paymentFilterLabel } from '../../../utils/statusLabels';
import { isInvertedRange, type OrdersToolbarFilters } from './ordersFilterValues';

interface Props {
  values: OrdersToolbarFilters;
  onChange: (values: OrdersToolbarFilters) => void;
}

const PAYMENT_OPTIONS = [
  { value: '', label: 'Todos los cobros' },
  ...PAYMENT_STATUS_ORDER.map((status) => ({ value: status, label: paymentFilterLabel(status).text })),
];

/** Búsqueda, estado de cobro y rango de fechas de Pedidos, resueltos en la API (GET /orders). El estado va por pestañas. */
export const OrdersFilters = ({ values, onChange }: Props) => {
  const set = (patch: Partial<OrdersToolbarFilters>) => onChange({ ...values, ...patch });
  const invertedRange = isInvertedRange(values);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <SearchInput
        label="Buscar pedidos"
        placeholder="Cliente, teléfono o n.º de pedido"
        value={values.search}
        onChange={(e) => set({ search: e.target.value })}
        className="lg:w-80"
      />
      <Select
        label="Cobro"
        className="lg:w-44"
        value={values.payment}
        options={PAYMENT_OPTIONS}
        onChange={(e) => set({ payment: e.target.value as OrdersToolbarFilters['payment'] })}
      />
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
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
          error={invertedRange ? 'Tiene que ser igual o posterior a «Desde»' : undefined}
          onChange={(e) => set({ to: e.target.value })}
        />
      </div>
    </div>
  );
};
