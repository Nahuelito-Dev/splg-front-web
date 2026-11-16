import { DateRangeFilter, Select } from '../../../common/components/ui';
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

/**
 * Estado de cobro y rango de fechas de Pedidos, resueltos en la API (GET /orders). Van como `filters` del
 * `TableToolbar`, que pone la búsqueda; el estado va por pestañas.
 */
export const OrdersFilters = ({ values, onChange }: Props) => {
  const set = (patch: Partial<OrdersToolbarFilters>) => onChange({ ...values, ...patch });

  return (
    <>
      <Select
        label="Cobro"
        className="lg:w-44"
        value={values.payment}
        options={PAYMENT_OPTIONS}
        onChange={(e) => set({ payment: e.target.value as OrdersToolbarFilters['payment'] })}
      />
      <div className="flex flex-col gap-1.5">
        <DateRangeFilter from={values.from} to={values.to} onChange={set} />
        {isInvertedRange(values) && (
          <p role="alert" className="text-xs text-danger">
            Tiene que ser igual o posterior a «Desde»
          </p>
        )}
      </div>
    </>
  );
};
