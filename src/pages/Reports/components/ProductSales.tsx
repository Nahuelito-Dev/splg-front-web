import { RankBarsChart } from '../../../common/components/ui';
import type { VentasPorProducto } from '../../../services/api/types';
import { useSalesByProduct } from '../../../services/queries/reports';
import type { DayRange } from '../../../utils/dateRange';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { ReportSection } from './ReportSection';
import type { ReportColumn } from './ReportTable';

export const ProductSales = ({ range }: { range: DayRange }) => {
  const { data = [], isLoading, error, refetch } = useSalesByProduct(range);
  const sum = (pick: (row: VentasPorProducto) => number) => data.reduce((acc, row) => acc + pick(row), 0);

  const columns: ReportColumn<VentasPorProducto>[] = [
    {
      header: 'Producto',
      render: (r) => <span className="font-medium">{r.productType}</span>,
      csv: (r) => r.productType,
    },
    {
      header: 'Descripción',
      wide: true,
      render: (r) => <span className="line-clamp-1 text-muted">{r.description ?? '—'}</span>,
      csv: (r) => r.description ?? '',
    },
    {
      header: 'Unidades',
      numeric: true,
      render: (r) => formatNumber(r.totalQuantity),
      csv: (r) => r.totalQuantity,
      total: formatNumber(sum((r) => r.totalQuantity)),
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
      title="Ventas por producto"
      description="Facturación de cada producto entregado en el período."
      fileName={`ventas-por-producto_${range.from}_${range.to}`}
      rows={data}
      columns={columns}
      getKey={(r) => `${r.productType}|${r.description ?? ''}`}
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      chart={
        <RankBarsChart
          data={data.map((r) => ({ name: r.productType, value: Number(r.totalSales) }))}
          formatValue={formatCurrency}
          seriesName="Ventas"
        />
      }
    />
  );
};
