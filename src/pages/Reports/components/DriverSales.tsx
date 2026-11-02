import { RankBarsChart } from '../../../common/components/ui';
import type { VentasPorChofer } from '../../../services/api/types';
import { useSalesByDriver } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { ReportSection } from './ReportSection';
import type { ReportColumn } from './ReportTable';

const nameOf = (row: VentasPorChofer) => row.driverName ?? 'Sin nombre';

export const DriverSales = ({ range }: { range: DayRange }) => {
  const { data: report, isLoading, error, refetch } = useSalesByDriver(range);
  // El back manda las filas de mayor a menor venta y los totales: la tabla y el gráfico muestran el mismo ranking.
  const data = report?.rows ?? [];
  const totals = report?.totals;

  const columns: ReportColumn<VentasPorChofer>[] = [
    { header: 'Chofer', render: (r) => <span className="font-medium">{nameOf(r)}</span>, csv: nameOf },
    {
      header: 'Pedidos',
      numeric: true,
      render: (r) => formatNumber(r.totalOrders),
      csv: (r) => r.totalOrders,
      total: totals && formatNumber(totals.totalOrders),
    },
    {
      header: 'Ventas',
      numeric: true,
      render: (r) => formatCurrency(r.totalSales),
      csv: (r) => r.totalSales,
      total: totals && formatCurrency(totals.totalSales),
    },
  ];

  return (
    <ReportSection
      title="Ventas por chofer"
      description="Pedidos entregados y facturación de cada chofer."
      fileName={`ventas-por-chofer_${range.from}_${range.to}`}
      rows={data}
      columns={columns}
      getKey={(r) => r.driverId}
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      chart={
        <RankBarsChart
          data={data.map((r) => ({ name: nameOf(r), value: Number(r.totalSales) }))}
          formatValue={formatCurrency}
          seriesName="Ventas"
        />
      }
    />
  );
};
