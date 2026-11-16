import { Link } from 'react-router-dom';
import { HardHat, ReceiptText, ScanText, ShoppingBag, Users, Wallet } from 'lucide-react';
import { Badge, Card, CardHeader, DateRangeFilter, EmptyState, KpiCard } from '../../../common/components/ui';
import type { CompanyDetail } from '../../../services/api/types';
import { formatCurrency, formatDateTime, formatNumber, formatUsd } from '../../../utils/format';
import { PROCESS_HEALTH, labelOf } from '../../../utils/statusLabels';
import { formatMonth, formatRange } from '../../Platform/platformRules';
import { needsAttention, sortByAttention } from '../../Configuration/processMonitorRules';

interface Props {
  detail: CompanyDetail;
  range: { from: string; to: string };
  onRangeChange: (range: { from: string; to: string }) => void;
}

/** Los números de la empresa en el período, el lector del mes y la salud de sus procesos. */
export const CompanyUsageTab = ({ detail, range, onRangeChange }: Props) => {
  const { metrics, documentReading } = detail;
  const processes = sortByAttention(detail.processes);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <DateRangeFilter from={range.from} to={range.to} onChange={onRangeChange} label="Período" />
        <p className="text-sm text-muted">Período: {formatRange(detail.range)}</p>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Pedidos" icon={ReceiptText} value={formatNumber(metrics.orders)} hint="Creados en el período" />
        <KpiCard
          title="Ventas"
          icon={ShoppingBag}
          value={formatNumber(metrics.salesOrders)}
          hint="Entregadas y cobradas"
        />
        <KpiCard title="Facturación" icon={Wallet} value={formatCurrency(metrics.revenue)} hint="De las ventas" />
        <KpiCard title="Choferes activos" icon={HardHat} value={formatNumber(metrics.activeDrivers)} />
        <KpiCard title="Clientes" icon={Users} value={formatNumber(metrics.customers)} />
        <KpiCard
          title="Lector de documentos"
          icon={ScanText}
          value={formatUsd(documentReading.costUsd)}
          hint={`${formatNumber(documentReading.readings)} lecturas · tope ${formatUsd(documentReading.monthlyBudgetUsd)}`}
          pill={
            documentReading.enabled
              ? { text: `Encendido · ${formatMonth(documentReading.month)}`, trend: 'neutral' }
              : { text: 'Apagado', trend: 'warn' }
          }
        />
      </div>

      <Card className="p-6">
        <CardHeader
          title="Procesos automáticos"
          subtitle="Los propios de la empresa (sin los que corren para todas)."
          action={
            <Link
              to={`/platform/monitoring?company=${detail.company.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver en Monitoreo
            </Link>
          }
        />
        {processes.length === 0 ? (
          <EmptyState title="Sin procesos propios" description="Todavía no corrió ningún proceso de esta empresa." />
        ) : (
          <ul className="divide-y divide-outline">
            {processes.map((process) => (
              <li key={process.process} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{process.title}</p>
                  <p className="text-xs text-muted">
                    {process.lastRunAt ? `Última corrida: ${formatDateTime(process.lastRunAt)}` : 'Nunca corrió'}
                    {process.failuresLast24h > 0 && ` · ${process.failuresLast24h} fallas en 24 h`}
                  </p>
                </div>
                <Badge
                  label={labelOf(PROCESS_HEALTH, process.health)}
                  variant={needsAttention(process) ? 'filled' : 'soft'}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
