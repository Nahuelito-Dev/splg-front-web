import { ShareDonutChart } from '../../../common/components/ui';
import type { VentasPorMedioDePago } from '../../../services/api/types';
import { useSalesByPayment } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { PAYMENT_LABELS } from './paymentLabels';
import { ReportSection } from './ReportSection';
import type { ReportColumn } from './ReportTable';

const labelOf = (row: VentasPorMedioDePago) => PAYMENT_LABELS[row.method] ?? row.method;

export const PaymentSales = ({ range }: { range: DayRange }) => {
  const { data = [], isLoading, error, refetch } = useSalesByPayment(range);
  const sum = (pick: (row: VentasPorMedioDePago) => number) => data.reduce((acc, row) => acc + pick(row), 0);

  const columns: ReportColumn<VentasPorMedioDePago>[] = [
    { header: 'Método', render: (r) => <span className="font-medium">{labelOf(r)}</span>, csv: labelOf },
    {
      header: 'Pedidos',
      numeric: true,
      render: (r) => formatNumber(r.totalOrders),
      csv: (r) => r.totalOrders,
      total: formatNumber(sum((r) => r.totalOrders)),
    },
    {
      header: 'Ventas',
      numeric: true,
      render: (r) => formatCurrency(r.totalSales),
      csv: (r) => r.totalSales,
      total: formatCurrency(sum((r) => r.totalSales)),
    },
  ];

  return (
    <ReportSection
      title="Ventas por método de pago"
      description="Cómo pagaron los pedidos entregados."
      fileName={`ventas-por-pago_${range.from}_${range.to}`}
      rows={data}
      columns={columns}
      getKey={(r) => r.method}
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      chart={
        <ShareDonutChart
          data={data.map((r) => ({ name: labelOf(r), value: Number(r.totalSales) }))}
          formatValue={formatCurrency}
          totalLabel="vendido"
        />
      }
    />
  );
};
