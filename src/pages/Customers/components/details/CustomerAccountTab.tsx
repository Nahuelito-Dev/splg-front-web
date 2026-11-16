import { Banknote, Hourglass, Landmark, ScrollText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  KpiCard,
  ListSkeleton,
} from '../../../../common/components/ui';
import type { CustomerAccount } from '../../../../services/api/types';
import { useCustomerStatement } from '../../../../services/queries/finance';
import { formatCurrencyExact as formatCurrency, formatDateTime, formatShortId } from '../../../../utils/format';
import { ACCOUNT_STATUS, CUSTOMER_ENTRY_TYPE, labelOf } from '../../../../utils/statusLabels';
import { CustomerAccountAction } from '../../../Finance/components/CustomerAccountAction';

const LAST_ENTRIES = { page: 0, pageSize: 8 };

interface Props {
  userId: string;
  name: string;
  /** La cuenta corriente del cliente en esta distribuidora; null si no tiene, undefined mientras carga. */
  account: CustomerAccount | null | undefined;
  loading: boolean;
  /** Administrador general sin «Ver como»: la API no contesta sin distribuidora. */
  needsDistributor: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Pestaña «Cuenta corriente» de la ficha del cliente: saldo, crédito, deuda vencida y los últimos asientos. */
export const CustomerAccountTab = ({ userId, name, account, loading, needsDistributor, error, onRetry }: Props) => {
  const navigate = useNavigate();
  const statement = useCustomerStatement(needsDistributor ? undefined : account?.accountId, LAST_ENTRIES);

  if (needsDistributor) {
    return (
      <Card>
        <EmptyState
          icon={Landmark}
          title="Elegí una distribuidora"
          description="La cuenta corriente es de cada distribuidora: elegí una con «Ver como» para verla."
        />
      </Card>
    );
  }
  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState error={error} resource="La cuenta corriente" onRetry={onRetry} />;
  if (!account) {
    return (
      <Card>
        <EmptyState
          icon={Landmark}
          title="Sin cuenta corriente"
          description="Este cliente compra al contado. Podés habilitarle una cuenta con límite de crédito y plazo de pago."
          action={<CustomerAccountAction userId={userId} name={name} />}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Saldo"
          icon={Landmark}
          value={formatCurrency(account.balance)}
          hint="Positivo: el cliente debe"
        />
        <KpiCard
          title="Crédito disponible"
          icon={Banknote}
          value={formatCurrency(account.availableCredit)}
          hint={`Límite ${formatCurrency(account.creditLimit)}`}
          pill={account.availableCredit < 0 ? { text: 'Se pasó del límite', trend: 'down' } : undefined}
        />
        <KpiCard title="A cuenta sin entregar" icon={ScrollText} value={formatCurrency(account.pendingOrdersAmount)} />
        <KpiCard
          title="Vencido"
          icon={Hourglass}
          value={formatCurrency(account.overdueAmount)}
          pill={account.overdueAmount > 0 ? { text: 'Reclamar', trend: 'down' } : undefined}
        />
      </div>

      <Card>
        <CardHeader
          title="Últimos asientos"
          badge={<Badge label={labelOf(ACCOUNT_STATUS, account.status)} />}
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<Landmark />}
              onClick={() => navigate(`/finance/accounts/${account.accountId}`)}
            >
              Abrir cuenta corriente
            </Button>
          }
          className="border-b border-outline p-4"
        />
        {statement.error ? (
          <ErrorState error={statement.error} resource="El estado de cuenta" onRetry={() => void statement.refetch()} />
        ) : !statement.data ? (
          <ListSkeleton />
        ) : statement.data.data.length === 0 ? (
          <EmptyState icon={ScrollText} title="Sin movimientos" description="La cuenta todavía no tiene asientos." />
        ) : (
          <ul className="divide-y divide-outline-soft">
            {statement.data.data.map((entry) => (
              <li key={entry.entryId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(CUSTOMER_ENTRY_TYPE, entry.type)} />
                    {entry.orderId && (
                      <Link className="font-mono text-xs text-primary underline" to={`/orders/${entry.orderId}`}>
                        {formatShortId(entry.orderId)}
                      </Link>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {formatDateTime(entry.occurredAt)}
                    {entry.description ? ` · ${entry.description}` : ''}
                  </p>
                </div>
                <span className={`font-mono text-sm ${entry.signedAmount < 0 ? 'text-success' : 'text-ink'}`}>
                  {formatCurrency(entry.signedAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
