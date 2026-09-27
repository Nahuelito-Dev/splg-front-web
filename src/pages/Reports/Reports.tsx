import { useState } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { Button, Card, PageHeader } from '../../common/components/ui';
import { useDebounce } from '../../hooks';
import { useSalesByDriver, useSalesByPayment, useSalesByProduct } from '../../services/queries/reports';
import { downloadCsv, rowsToCsv } from '../../utils/csv';
import { daysAgo } from '../../utils/dates';
import { formatCurrency, formatDay, formatNumber } from '../../utils/format';
import { DriverPaymentCharts } from './components/DriverPaymentCharts';
import { PAYMENT_LABELS } from './components/paymentLabels';
import { ProductSalesTable } from './components/ProductSalesTable';
import { SalesEvolutionChart } from './components/SalesEvolutionChart';

export const Reports = () => {
  // Por defecto, los últimos 30 días: con sólo el día de hoy la evolución era un punto.
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => daysAgo(0));
  const debouncedFrom = useDebounce(from, 600);
  const debouncedTo = useDebounce(to, 600);
  const range = { from: debouncedFrom, to: debouncedTo };

  const { data: byDriver = [], isFetching: loadingDriver } = useSalesByDriver(range);
  const { data: byProduct = [], isFetching: loadingProduct } = useSalesByProduct(range);
  const { data: byPayment = [], isFetching: loadingPayment } = useSalesByPayment(range);

  const isLoading = loadingDriver || loadingProduct || loadingPayment;
  const totalSales = byPayment.reduce((acc, p) => acc + Number(p.totalSales), 0);
  const totalOrders = byPayment.reduce((acc, p) => acc + Number(p.totalOrders), 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const hasAnyData = byDriver.length > 0 || byProduct.length > 0 || byPayment.length > 0;

  const handleExport = () => {
    const rangeLabel = range.from && range.to ? `${range.from}_a_${range.to}` : 'periodo-actual';
    const content = [
      'Ventas por chofer',
      rowsToCsv(
        ['Chofer', 'Pedidos entregados', 'Ventas totales'],
        byDriver.map((d) => [d.driverName, d.totalOrders, d.totalSales]),
      ),
      '',
      'Ventas por producto',
      rowsToCsv(
        ['Tipo', 'Descripción', 'Cantidad vendida', 'Ventas totales'],
        byProduct.map((p) => [p.productType, p.description, p.totalQuantity, p.totalSales]),
      ),
      '',
      'Ventas por método de pago',
      rowsToCsv(
        ['Método', 'Pedidos', 'Ventas totales'],
        byPayment.map((p) => [PAYMENT_LABELS[p.method] ?? p.method, p.totalOrders, p.totalSales]),
      ),
    ].join('\n');
    downloadCsv(`reporte-splg-${rangeLabel}.csv`, content);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <PageHeader
        title="Reportes"
        description={
          range.from && range.to
            ? `Ventas entregadas del ${formatDay(range.from)} al ${formatDay(range.to)}.`
            : 'Ventas entregadas del día de hoy.'
        }
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted">
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-outline bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-outline bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <Button variant="secondary" icon={<DownloadOutlinedIcon />} disabled={!hasAnyData} onClick={handleExport}>
              Exportar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <p className="mb-2 text-xs font-bold uppercase text-muted">Facturación del período</p>
          <h3 className="text-3xl font-black text-ink">{isLoading ? '…' : formatCurrency(totalSales)}</h3>
        </Card>
        <Card className="p-6">
          <p className="mb-2 text-xs font-bold uppercase text-muted">Pedidos entregados</p>
          <h3 className="text-3xl font-black text-ink">{isLoading ? '…' : formatNumber(totalOrders)}</h3>
        </Card>
        <Card className="p-6">
          <p className="mb-2 text-xs font-bold uppercase text-muted">Ticket promedio</p>
          <h3 className="text-3xl font-black text-primary-strong">{isLoading ? '…' : formatCurrency(avgOrderValue)}</h3>
        </Card>
      </div>

      <SalesEvolutionChart range={range} />
      <DriverPaymentCharts byDriver={byDriver} byPayment={byPayment} />
      <ProductSalesTable rows={byProduct} />
    </div>
  );
};
