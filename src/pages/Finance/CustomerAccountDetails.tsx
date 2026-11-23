import { useState } from 'react';
import { Banknote, Hourglass, Landmark, Paperclip, Pencil, Scale, ScrollText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import { AttachmentsDrawer } from '../../common/components/AttachmentsDrawer';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  PageHeader,
  ResponsiveTable,
  RowActions,
  PageContainer,
  DateRangeFilter,
  type TableColumn,
} from '../../common/components/ui';
import { useBackToList, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { CustomerEntry } from '../../services/api/types';
import { useCustomerAccount, useCustomerStatement } from '../../services/queries/finance';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../utils/format';
import { ACCOUNT_STATUS, CUSTOMER_ENTRY_TYPE, TAX_CONDITION, labelOf } from '../../utils/statusLabels';
import { CustomerAccountFormModal } from './components/CustomerAccountFormModal';
import { CustomerAdjustmentModal } from './components/CustomerAdjustmentModal';
import { CustomerPaymentModal } from './components/CustomerPaymentModal';

/** La ficha de una cuenta corriente: crédito, antigüedad y estado de cuenta con saldo corrido (CU-238). */
export const CustomerAccountDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/finance/accounts');
  const { canWrite, writeHint } = usePermissions();
  const { data: account, isPending, error, refetch } = useCustomerAccount(id);
  useCrumbLeaf(account?.businessName, goBack);
  const [{ from, to }, setFilters, pagination, setPagination] = useUrlPagedParams({ from: '', to: '' }, 25);
  const rangeInvalid = Boolean(from && to && from > to);
  const statement = useCustomerStatement(rangeInvalid ? undefined : id, pagination, {
    from: from || undefined,
    to: to || undefined,
  });
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [attaching, setAttaching] = useState<CustomerEntry | null>(null);

  const columns: TableColumn<CustomerEntry>[] = [
    {
      field: 'occurredAt',
      kind: 'date',
      headerName: 'Fecha',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.occurredAt),
    },
    {
      field: 'type',
      headerName: 'Asiento',
      flex: 1.3,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="flex min-w-0 flex-col gap-0.5 py-1">
          <span className="flex items-center gap-2">
            <Badge label={labelOf(CUSTOMER_ENTRY_TYPE, row.type)} />
            {row.orderId && (
              <Link className="font-mono text-xs text-primary underline" to={`/orders/${row.orderId}`}>
                {formatShortId(row.orderId)}
              </Link>
            )}
          </span>
          <span className="truncate text-xs text-muted">
            {row.description ?? (row.dueDate ? `Vence ${formatDay(row.dueDate)}` : '')}
          </span>
        </span>
      ),
    },
    {
      field: 'signedAmount',
      headerName: 'Importe',
      width: 140,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <span className={`tabular-nums ${row.signedAmount < 0 ? 'text-success' : ''}`}>
          {formatCurrency(row.signedAmount)}
        </span>
      ),
    },
    {
      field: 'pendingAmount',
      headerName: 'Sin saldar',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => (row.signedAmount > 0 ? formatCurrency(row.pendingAmount) : '—'),
    },
    {
      field: 'balanceAfter',
      headerName: 'Saldo',
      width: 140,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => (row.balanceAfter === null ? '—' : formatCurrency(row.balanceAfter)),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`asiento ${labelOf(CUSTOMER_ENTRY_TYPE, row.type).text} del ${formatDateTime(row.occurredAt)}`}
          actions={[{ label: 'Comprobantes', icon: Paperclip, onClick: () => setAttaching(row) }]}
        />
      ),
    },
  ];

  useClampPage(pagination, statement.data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title={account?.businessName ?? 'Cuenta corriente'}
        eyebrow={account ? account.customerName || undefined : undefined}
        badges={account && <Badge label={labelOf(ACCOUNT_STATUS, account.status)} />}
        secondaryActions={
          account
            ? [
                {
                  label: 'Modificar',
                  icon: <Pencil />,
                  disabled: !canWrite,
                  title: writeHint,
                  onClick: () => setEditing(true),
                },
                {
                  label: 'Ajuste',
                  icon: <Scale />,
                  disabled: !canWrite || account.status === 'closed',
                  title: writeHint,
                  onClick: () => setAdjusting(true),
                },
              ]
            : []
        }
        actions={
          account && (
            <Button
              icon={<Banknote />}
              disabled={!canWrite || account.status === 'closed'}
              title={writeHint}
              onClick={() => setPaying(true)}
            >
              Registrar pago
            </Button>
          )
        }
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !account ? (
        <ErrorState error={error} resource="La cuenta corriente" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <KpiGrid className="sm:grid-cols-2 lg:grid-cols-4">
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
            <KpiCard
              title="Pedidos a cuenta sin entregar"
              icon={ScrollText}
              value={formatCurrency(account.pendingOrdersAmount)}
            />
            <KpiCard
              title="Vencido"
              icon={Hourglass}
              value={formatCurrency(account.overdueAmount)}
              pill={account.overdueAmount > 0 ? { text: 'Reclamar', trend: 'down' } : undefined}
            />
          </KpiGrid>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <CardHeader title="Datos" className="mb-3" />
              <DetailList
                items={[
                  { label: 'Cliente', value: account.customerName || '—' },
                  { label: 'Correo', value: account.customerEmail ?? '—' },
                  { label: 'CUIT', value: account.taxId ?? '—', mono: true },
                  { label: 'Condición fiscal', value: labelOf(TAX_CONDITION, account.taxCondition).text },
                  { label: 'Plazo de pago', value: `${account.paymentTermsDays} días` },
                  { label: 'Límite de crédito', value: formatCurrency(account.creditLimit) },
                ]}
              />
            </Card>
            <Card className="p-5">
              <CardHeader title="Antigüedad de la deuda" className="mb-3" />
              <DetailList
                items={[
                  { label: '0 a 30 días', value: formatCurrency(account.aging.upTo30Days) },
                  { label: '31 a 60 días', value: formatCurrency(account.aging.from31To60Days) },
                  { label: '61 a 90 días', value: formatCurrency(account.aging.from61To90Days) },
                  { label: 'Más de 90 días', value: formatCurrency(account.aging.over90Days) },
                  { label: 'Total abierto', value: formatCurrency(account.aging.total) },
                ]}
              />
            </Card>
          </div>
          <Card>
            <CardHeader
              title="Estado de cuenta"
              action={<DateRangeFilter from={from} to={to} onChange={(range) => setFilters(range)} />}
              className="border-b border-outline px-5 py-4"
            />
            {rangeInvalid && (
              <p role="alert" className="border-b border-outline px-5 py-2 text-xs text-danger">
                Anterior a la fecha inicial
              </p>
            )}
            {statement.data && (
              <p className="border-b border-outline px-5 py-2 tabular-nums text-sm text-muted">
                Saldo inicial {formatCurrency(statement.data.openingBalance)} · saldo final{' '}
                {formatCurrency(statement.data.closingBalance)}
              </p>
            )}
            {statement.error ? (
              <ErrorState
                error={statement.error}
                resource="El estado de cuenta"
                onRetry={() => void statement.refetch()}
              />
            ) : (
              <ResponsiveTable
                label="asientos de la cuenta"
                rows={statement.data?.data ?? []}
                columns={columns}
                getRowId={(row) => row.entryId}
                loading={statement.isFetching}
                pagination={{ model: pagination, onChange: setPagination, total: statement.data?.total ?? 0 }}
                empty={<EmptyState icon={ScrollText} title="Sin movimientos en el período" />}
                renderCard={(row) => (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <Badge label={labelOf(CUSTOMER_ENTRY_TYPE, row.type)} />
                      <span className="tabular-nums">{formatCurrency(row.signedAmount)}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {formatDateTime(row.occurredAt)} · saldo{' '}
                      {row.balanceAfter === null ? '—' : formatCurrency(row.balanceAfter)}
                    </div>
                    <div>
                      <Button size="sm" variant="secondary" icon={<Paperclip />} onClick={() => setAttaching(row)}>
                        Comprobantes
                      </Button>
                    </div>
                  </>
                )}
              />
            )}
          </Card>
          <CustomerAccountFormModal open={editing} onClose={() => setEditing(false)} account={account} />
          <CustomerPaymentModal open={paying} onClose={() => setPaying(false)} account={account} />
          <AttachmentsDrawer
            owner={
              attaching
                ? {
                    ownerType: 'customer_account_entry',
                    ownerId: attaching.entryId,
                    description: `${labelOf(CUSTOMER_ENTRY_TYPE, attaching.type).text} · ${formatDateTime(attaching.occurredAt)}`,
                  }
                : null
            }
            onClose={() => setAttaching(null)}
            canWrite={canWrite}
            blockedReason={writeHint}
            hint="El recibo del pago, el remito…"
          />
          <CustomerAdjustmentModal open={adjusting} onClose={() => setAdjusting(false)} account={account} />
        </div>
      )}
    </PageContainer>
  );
};
