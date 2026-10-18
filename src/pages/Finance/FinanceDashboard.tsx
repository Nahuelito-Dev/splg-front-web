import { Banknote, HandCoins, Landmark, Percent, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, ErrorState, Input, KpiCard, LoadingState, PageHeader } from '../../common/components/ui';
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
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Finanzas"
        description="La plata de la distribuidora de un vistazo."
        actions={<Input label="Día" type="date" value={date} onChange={(e) => setDate(e.target.value || today())} />}
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
            <KpiCard
              title="Comisiones por liquidar"
              icon={Percent}
              value={formatCurrency(data.commissions.pendingToLiquidate)}
              hint={`${data.commissions.employees} choferes`}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between border-b border-outline px-5 py-3">
                <h2 className="text-base font-semibold">Cajas</h2>
                <Link className="text-sm text-primary underline" to="/finance/boxes">
                  Ver cajas
                </Link>
              </div>
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
              <div className="flex items-center justify-between border-b border-outline px-5 py-3">
                <h2 className="text-base font-semibold">Rendiciones</h2>
                <Link className="text-sm text-primary underline" to={`/finance/settlements?date=${data.date}`}>
                  Ver rendiciones
                </Link>
              </div>
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
    </div>
  );
};
