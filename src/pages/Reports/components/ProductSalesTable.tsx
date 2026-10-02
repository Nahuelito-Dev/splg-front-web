import { Card, EmptyState } from '../../../common/components/ui';
import type { VentasPorProducto } from '../../../services/api/types';
import { formatCurrency, formatNumber } from '../../../utils/format';

interface Props {
  rows: VentasPorProducto[];
}

export const ProductSalesTable = ({ rows }: Props) => (
  <Card className="overflow-hidden">
    <div className="border-b border-outline px-6 py-4">
      <h3 className="font-display text-base font-semibold text-ink">Ventas por producto</h3>
    </div>
    {rows.length === 0 ? (
      <EmptyState
        title="Sin ventas de productos"
        description="No hubo ventas de productos en el período seleccionado."
      />
    ) : (
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline bg-surface-hover font-medium text-muted">
          <tr>
            <th className="px-6 py-3">Tipo</th>
            <th className="px-6 py-3">Descripción</th>
            <th className="px-6 py-3 text-right">Cantidad vendida</th>
            <th className="px-6 py-3 text-right">Ventas totales</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline">
          {rows.map((row, index) => (
            <tr key={`${row.productType}-${index}`} className="hover:bg-surface-hover/60">
              <td className="px-6 py-3 font-semibold text-ink">{row.productType}</td>
              <td className="px-6 py-3 text-muted">{row.description ?? '—'}</td>
              <td className="px-6 py-3 text-right text-ink">{formatNumber(row.totalQuantity)}</td>
              <td className="px-6 py-3 text-right font-bold text-ink">{formatCurrency(row.totalSales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </Card>
);
