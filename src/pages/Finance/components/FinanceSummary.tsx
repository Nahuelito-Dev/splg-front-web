import type { LucideIcon } from 'lucide-react';
import { Banknote, CircleDollarSign, Clock, HandCoins, Landmark, Percent, Wallet } from 'lucide-react';
import { KpiCard } from '../../../common/components/ui';
import { useFinanceDashboard } from '../../../services/queries/finance';
import { formatCurrency, formatDay, formatNumber } from '../../../utils/format';

interface Kpi {
  title: string;
  icon: LucideIcon;
  value: string;
  hint?: string;
  warn?: string;
}

interface Props {
  /** Día del tablero (YYYY-MM-DD); sin él, hoy. */
  date?: string;
  /** Qué cifras del tablero financiero mostrar arriba del listado. */
  kind: 'boxes' | 'movements' | 'settlements' | 'accounts' | 'commissions';
}

/** Cuatro cifras del tablero financiero (`GET /finance/dashboard`) sobre un listado de Finanzas; sin dato no se dibuja. */
export const FinanceSummary = ({ date, kind }: Props) => {
  const { data, isPending, isError } = useFinanceDashboard(date);
  if (isError) return null;

  const kpis: Kpi[] = !data
    ? Array.from({ length: kind === 'boxes' ? 2 : 3 }, () => ({ title: '…', icon: Wallet, value: '' }))
    : kind === 'boxes'
      ? [
          { title: 'Saldo en cajas', icon: Wallet, value: formatCurrency(data.totalBalance) },
          { title: 'Cajas', icon: Landmark, value: formatNumber(data.cashBoxes.length) },
        ]
      : kind === 'movements'
        ? [
            {
              title: `Entradas del ${formatDay(data.date)}`,
              icon: Banknote,
              value: formatCurrency(data.movements.income),
            },
            {
              title: `Salidas del ${formatDay(data.date)}`,
              icon: CircleDollarSign,
              value: formatCurrency(data.movements.expense),
            },
            { title: 'Movimientos del día', icon: Clock, value: formatNumber(data.movements.count) },
          ]
        : kind === 'settlements'
          ? [
              {
                title: 'Efectivo por rendir',
                icon: HandCoins,
                value: formatCurrency(data.settlements.pendingCash),
              },
              { title: 'Rendiciones abiertas', icon: Clock, value: formatNumber(data.settlements.open) },
              {
                title: 'Presentadas sin aprobar',
                icon: Banknote,
                value: formatNumber(data.settlements.submitted),
                warn: data.settlements.overdue > 0 ? `${data.settlements.overdue} atrasadas` : undefined,
              },
            ]
          : kind === 'accounts'
            ? [
                { title: 'Deuda de clientes', icon: Landmark, value: formatCurrency(data.receivables.totalDebt) },
                { title: 'Deuda vencida', icon: Clock, value: formatCurrency(data.receivables.overdueDebt) },
                { title: 'Cuentas con deuda', icon: Wallet, value: formatNumber(data.receivables.accountsWithDebt) },
              ]
            : [
                {
                  title: 'Comisiones por liquidar',
                  icon: Percent,
                  value: formatCurrency(data.commissions.pendingToLiquidate),
                  hint: `${data.commissions.employees} choferes`,
                },
              ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.title}
          title={kpi.title}
          icon={kpi.icon}
          value={kpi.value}
          loading={isPending}
          hint={kpi.hint}
          pill={kpi.warn ? { text: kpi.warn, trend: 'warn' } : undefined}
        />
      ))}
    </div>
  );
};
