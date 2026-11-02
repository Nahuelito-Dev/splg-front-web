import { Banknote, HandCoins, Landmark, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  CardHeader,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  PageContainer,
  DayFilter,
} from '../../common/components/ui';
import { useUrlParam } from '../../hooks';
import { useFinanceDashboard } from '../../services/queries/finance';
import { toIsoDay } from '../../utils/dates';
import { formatCurrency, formatDay } from '../../utils/format';
import { CASH_BOX_KIND, labelOf } from '../../utils/statusLabels';

const today = () => toIsoDay(new Date());

/** El tablero financiero: cajas, rendiciones, deuda de clientes y comisiones por liquidar (CU-245). */
export const FinanceDashboard = () => {
  const [date, setDate] = useUrlParam('date', today());
  const { data, isPending, error, refetch } = useFinanceDashboard(date);

  return (
    <PageContainer>
      <PageHeader
        title="Finanzas"
        description="La plata de la distribuidora de un vistazo."
        actions={
          <>
            <Link className="text-sm text-primary underline" to="/finance/income-statement">
              Ingresos y egresos
            </Link>
            <DayFilter value={date} onChange={(day) => setDate(day || today())} />
          </>
        }
      />
      {isPending ? (
        <LoadingState label="Cargando el tablero…" />
      ) : error || !data ? (
        <ErrorState error={error} resource="El tablero" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Saldo en cajas" icon={Wallet} value={formatCurrency(data.totalBalance)} />
            <KpiCard
              title={`Entradas del ${formatDay(data.date)}`}
              icon={Banknote}
              value={formatCurrency(data.movements.income)}
              hint={`Salidas ${formatCurrency(data.movements.expense)}`}
            />
            <KpiCard
              title="Deuda de clientes"
              icon={Landmark}
              value={formatCurrency(data.receivables.totalDebt)}
              pill={
                data.receivables.overdueDebt > 0
                  ? { text: `${formatCurrency(data.receivables.overdueDebt)} vencida`, trend: 'down' }
                  : undefined
              }
              hint={`${data.receivables.accountsWithDebt} cuentas`}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Cajas"
                action={
                  <Link className="text-sm text-primary underline" to="/finance/boxes">
                    Ver cajas
                  </Link>
                }
                className="border-b border-outline px-5 py-3"
              />
              <ul className="divide-y divide-outline">
                {data.cashBoxes.map((box) => (
                  <li key={box.cashBoxId} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{box.name}</span>
                      <span className="text-xs text-muted">
                        {labelOf(CASH_BOX_KIND, box.kind).text}
                        {box.hasOpenSession ? ' · abierta' : ''}
                      </span>
                    </span>
                    <strong className="font-mono">{formatCurrency(box.balance)}</strong>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader
                title="Rendiciones"
                action={
                  <Link className="text-sm text-primary underline" to={`/finance/settlements?date=${data.date}`}>
                    Ver rendiciones
                  </Link>
                }
                className="border-b border-outline px-5 py-3"
              />
              <div className="grid gap-3 p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge label={{ text: `${data.settlements.open} abiertas`, tone: 'warn' }} />
                  <Badge label={{ text: `${data.settlements.submitted} presentadas`, tone: 'info' }} />
                  <Badge label={{ text: `${data.settlements.approved} aprobadas`, tone: 'success' }} />
                </div>
                <p className="flex items-center gap-2 text-sm">
                  <HandCoins aria-hidden="true" className="h-4 w-4 text-muted" />
                  Efectivo presentado sin aprobar:{' '}
                  <b className="font-mono">{formatCurrency(data.settlements.pendingCash)}</b>
                </p>
                {data.settlements.overdue > 0 && (
                  <p role="status" className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
                    {data.settlements.overdue} rendiciones de días anteriores siguen sin cerrar.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
