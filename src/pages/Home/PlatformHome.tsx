import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  HardHat,
  LifeBuoy,
  ReceiptText,
  ScanText,
  ShoppingBag,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  DateRangeFilter,
  ErrorState,
  KpiCard,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { RequestSupportButton } from '../../common/support/RequestSupportButton';
import { useSupportSession, useUrlParams } from '../../hooks';
import type { PlatformOverview } from '../../services/api/types';
import { usePlatformOverview } from '../../services/queries/platformConsole';
import { usePlatform } from '../../services/queries/supportSessions';
import { formatCurrency, formatDateTime, formatNumber, formatUsd } from '../../utils/format';
import { formatMonth, formatRange } from '../Platform/platformRules';

interface PlatformAlert {
  to: string;
  icon: LucideIcon;
  text: string;
}

/** Lo que pide atención ahora: procesos con problemas y pedidos de soporte sin responder. */
const alertsOf = (overview: PlatformOverview): PlatformAlert[] => {
  const alerts: PlatformAlert[] = [];
  const { processes, supportSessions } = overview;
  if (processes.alerts > 0) {
    alerts.push({
      to: '/platform/monitoring',
      icon: TriangleAlert,
      text:
        processes.alerts === 1
          ? '1 proceso automático está atrasado, falló o quedó colgado.'
          : `${processes.alerts} procesos automáticos están atrasados, fallaron o quedaron colgados.`,
    });
  }
  if (processes.failuresLast24h > 0) {
    alerts.push({
      to: '/platform/monitoring',
      icon: Activity,
      text:
        processes.failuresLast24h === 1
          ? '1 corrida fallida en las últimas 24 horas.'
          : `${processes.failuresLast24h} corridas fallidas en las últimas 24 horas.`,
    });
  }
  if (supportSessions.pending > 0) {
    alerts.push({
      to: '/distributors',
      icon: LifeBuoy,
      text:
        supportSessions.pending === 1
          ? '1 pedido de acceso de soporte espera que la empresa lo apruebe.'
          : `${supportSessions.pending} pedidos de acceso de soporte esperan que la empresa los apruebe.`,
    });
  }
  return alerts;
};

const Overview = ({ overview }: { overview: PlatformOverview }) => {
  const { companies, totals, documentReading, processes, supportSessions } = overview;
  const alerts = alertsOf(overview);
  return (
    <div className="grid gap-4">
      {alerts.length > 0 && (
        <ul className="grid gap-2" aria-label="Alertas de la plataforma">
          {alerts.map(({ to, icon: Icon, text }) => (
            <li key={text}>
              <Link
                to={to}
                className="flex items-center gap-2 rounded-lg bg-warn-soft px-4 py-2.5 text-sm font-medium text-warn hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {text}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted">
        Período: {formatRange(overview.range)}. Actualizado el {formatDateTime(overview.generatedAt)}.
      </p>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Empresas"
          icon={Building2}
          value={formatNumber(companies.total)}
          hint={`${formatNumber(companies.active)} activas · ${formatNumber(companies.suspended)} suspendidas`}
        />
        <KpiCard title="Pedidos" icon={ReceiptText} value={formatNumber(totals.orders)} hint="Creados en el período" />
        <KpiCard
          title="Ventas"
          icon={ShoppingBag}
          value={formatNumber(totals.salesOrders)}
          hint="Entregadas y cobradas"
        />
        <KpiCard title="Facturación" icon={Wallet} value={formatCurrency(totals.revenue)} hint="De las ventas" />
        <KpiCard title="Choferes activos" icon={HardHat} value={formatNumber(totals.activeDrivers)} />
        <KpiCard title="Clientes" icon={Users} value={formatNumber(totals.customers)} />
        <KpiCard
          title="Lector de documentos"
          icon={ScanText}
          value={formatUsd(documentReading.costUsd)}
          hint={`${formatNumber(documentReading.readings)} lecturas · ${formatMonth(documentReading.month)}`}
        />
        <KpiCard
          title="Sesiones de soporte activas"
          icon={LifeBuoy}
          value={formatNumber(supportSessions.active)}
          hint={`${formatNumber(supportSessions.pending)} pedidos pendientes`}
        />
        <KpiCard
          title="Procesos con alerta"
          icon={Activity}
          value={formatNumber(processes.alerts)}
          hint={`${formatNumber(processes.failuresLast24h)} fallas en 24 h`}
          pill={processes.alerts > 0 ? { text: 'Revisar', trend: 'warn' } : { text: 'Al día', trend: 'up' }}
        />
      </div>
    </div>
  );
};

/**
 * El tablero de la plataforma (`GET /v2/platform/overview`): empresas, totales del período, lector del mes, procesos y
 * soporte. Son números agregados: para ver los datos de una empresa se pide acceso de soporte.
 */
export const PlatformHome = () => {
  const { data: platform } = usePlatform();
  const { pending } = useSupportSession();
  const [range, setRange] = useUrlParams({ from: '', to: '' });
  const { data, isPending, error, refetch } = usePlatformOverview(range);

  return (
    <PageContainer stack>
      <PageHeader
        title="Tablero de plataforma"
        eyebrow={platform?.name}
        description="Los números de todas las distribuidoras juntas. Sin fechas, el mes en curso hasta hoy."
        actions={<RequestSupportButton />}
      />
      {pending && (
        <Card className="p-4 text-sm text-ink-2">
          Pediste acceso a <span className="font-semibold text-ink">{pending.distributorName}</span>: en cuanto lo
          apruebe, el panel entra solo en modo soporte.
        </Card>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} label="Período" />
      </div>
      {error ? (
        <ErrorState error={error} resource="El tablero" onRetry={() => void refetch()} />
      ) : isPending ? (
        <LoadingState fullPage label="Cargando el tablero…" />
      ) : (
        <Overview overview={data} />
      )}
    </PageContainer>
  );
};
