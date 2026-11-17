import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  LoadingState,
  PageContainer,
  PageHeader,
  Select,
} from '../../common/components/ui';
import { useUrlParams } from '../../hooks';
import { useServerExport } from '../../hooks/useServerExport';
import type { IncomeStatement as IncomeStatementData } from '../../services/api/types';
import { useCashBoxOptions, useIncomeStatement } from '../../services/queries/finance';
import { formatCurrency } from '../../utils/format';
import { CASH_BOX_KIND, labelOf } from '../../utils/statusLabels';
import { IncomeExpenseChart } from './components/IncomeExpenseChart';
import {
  INCOME_PERIODS,
  defaultGroupBy,
  isGroupBy,
  isPeriodId,
  periodRange,
  rangeProblem,
  sharePercent,
  type IncomeGroupBy,
  type IncomePeriodId,
} from './incomeStatementPeriod';

type Category = IncomeStatementData['byCategory'][number];

const GROUPS: Array<{ value: IncomeGroupBy | ''; label: string }> = [
  { value: '', label: 'Automático' },
  { value: 'day', label: 'Por día' },
  { value: 'week', label: 'Por semana' },
  { value: 'month', label: 'Por mes' },
];

const CategoryList = ({
  title,
  rows,
  total,
  movementsUrl,
}: {
  title: string;
  rows: Category[];
  total: number;
  movementsUrl: (categoryId: string, direction: Category['direction']) => string;
}) => (
  <Card>
    <CardHeader title={title} className="border-b border-outline px-5 py-3" />
    {rows.length === 0 ? (
      <p className="px-5 py-6 text-sm text-muted">Sin movimientos en el período.</p>
    ) : (
      <ul className="divide-y divide-outline">
        {rows.map((row) => (
          <li key={`${row.categoryId}-${row.direction}`}>
            <Link
              to={movementsUrl(row.categoryId, row.direction)}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-hover"
              aria-label={`Ver los movimientos de ${row.name}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.name}</span>
                <span className="text-xs text-muted">
                  {row.count === 1 ? '1 movimiento' : `${row.count} movimientos`} · {sharePercent(row.amount, total)}
                </span>
              </span>
              <strong className="tabular-nums">{formatCurrency(row.amount)}</strong>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

/** Cuánto entró y cuánto salió de la caja en un período, y en qué (etapa 5 de Caja). */
export const IncomeStatement = () => {
  const [params, setParams] = useUrlParams({ period: 'thisMonth', from: '', to: '', groupBy: '', cashBoxId: '' });
  const period: IncomePeriodId = isPeriodId(params.period) ? params.period : 'thisMonth';
  const range = periodRange(period, { from: params.from, to: params.to });
  const problem = rangeProblem(range);
  const groupBy: IncomeGroupBy =
    (isGroupBy(params.groupBy) ? params.groupBy : null) ?? (problem ? 'day' : defaultGroupBy(range));
  const boxes = useCashBoxOptions();
  const filters = { from: range.from, to: range.to, groupBy, cashBoxId: params.cashBoxId || undefined };
  const { data, isPending, error, refetch } = useIncomeStatement(filters, !problem);
  const exportActions = useServerExport({
    resource: 'income-statement',
    params: filters,
    blockedReason: problem ?? undefined,
  });

  const movementsUrl = (categoryId: string, direction: Category['direction']) => {
    const query = new URLSearchParams({
      categoryId,
      direction,
      from: range.from,
      to: range.to,
      countsForResult: 'true',
    });
    if (params.cashBoxId) query.set('cashBoxId', params.cashBoxId);
    return `/finance/movements?${query.toString()}`;
  };
  const income = data?.byCategory.filter((c) => c.direction === 'in') ?? [];
  const expense = data?.byCategory.filter((c) => c.direction === 'out') ?? [];
  const empty = data !== undefined && data.byCategory.length === 0;

  return (
    <PageContainer>
      <PageHeader
        title="Ingresos y egresos"
        description="Cuánto entró y cuánto salió de las cajas, y en qué."
        secondaryActions={exportActions}
      />
      <div className="mb-6 grid gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
          {INCOME_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === period}
              onClick={() =>
                setParams({
                  period: p.id,
                  from: p.id === 'custom' ? range.from : '',
                  to: p.id === 'custom' ? range.to : '',
                })
              }
              className={
                p.id === period
                  ? 'rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-strong'
                  : 'rounded-full border border-outline bg-surface px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-hover'
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {period === 'custom' && (
            <DateRangeFilter
              label="Rango"
              from={params.from}
              to={params.to}
              onChange={(r) => setParams({ from: r.from, to: r.to })}
            />
          )}
          <Select
            label="Caja"
            options={[
              { value: '', label: 'Todas las cajas' },
              ...(boxes.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
            ]}
            value={params.cashBoxId}
            onChange={(e) => setParams({ cashBoxId: e.target.value })}
          />
          <Select
            label="Agrupar"
            options={GROUPS}
            value={isGroupBy(params.groupBy) ? params.groupBy : ''}
            onChange={(e) => setParams({ groupBy: e.target.value })}
          />
        </div>
      </div>
      {problem ? (
        <p role="alert" className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn">
          {problem}
        </p>
      ) : isPending ? (
        <LoadingState label="Calculando ingresos y egresos…" fullPage />
      ) : error || !data ? (
        <ErrorState error={error} resource="Ingresos y egresos" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <KpiGrid className="sm:grid-cols-3">
            <KpiCard title="Ingresos" icon={ArrowDownCircle} value={formatCurrency(data.totals.income)} />
            <KpiCard title="Egresos" icon={ArrowUpCircle} value={formatCurrency(data.totals.expense)} />
            <KpiCard
              title="Resultado de caja"
              icon={Scale}
              value={formatCurrency(data.totals.net)}
              pill={{
                text: data.totals.net >= 0 ? 'Superávit' : 'Déficit',
                trend: data.totals.net >= 0 ? 'up' : 'down',
              }}
            />
          </KpiGrid>
          {empty ? (
            <Card>
              <EmptyState
                icon={Scale}
                title="Sin movimientos en este período"
                description="Probá con otro período u otra caja. No cuentan las transferencias entre cajas ni los movimientos anulados."
              />
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Ingresos contra egresos" className="border-b border-outline px-5 py-3" />
                <div className="p-4">
                  <IncomeExpenseChart data={data.byPeriod} groupBy={data.groupBy} />
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CategoryList
                  title="Ingresos por categoría"
                  rows={income}
                  total={data.totals.income}
                  movementsUrl={movementsUrl}
                />
                <CategoryList
                  title="Egresos por categoría"
                  rows={expense}
                  total={data.totals.expense}
                  movementsUrl={movementsUrl}
                />
              </div>
              <Card>
                <CardHeader title="Por caja" className="border-b border-outline px-5 py-3" />
                <ul className="divide-y divide-outline">
                  {data.byCashBox.map((box) => (
                    <li
                      key={box.cashBoxId}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{box.name}</span>
                        <span className="text-xs text-muted">{labelOf(CASH_BOX_KIND, box.kind).text}</span>
                      </span>
                      <span className="flex gap-4 tabular-nums text-sm">
                        <span className="text-success">+ {formatCurrency(box.income)}</span>
                        <span className="text-danger">− {formatCurrency(box.expense)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
};
