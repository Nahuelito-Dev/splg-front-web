import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { ArrowLeftRight, BookOpen, Plus, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ExportCsvButton,
  FilterChips,
  IdentityCell,
  Input,
  PageHeader,
  ReasonModal,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import { toApiError } from '../../services/api/errors';
import type { CashMovement } from '../../services/api/types';
import {
  useCashBoxOptions,
  useCashCategories,
  useCashMovements,
  useReverseCashMovement,
  useReverseCashTransfer,
} from '../../services/queries/finance';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { CASH_REFERENCE, labelOf } from '../../utils/statusLabels';
import { FinanceSummary } from './components/FinanceSummary';
import { CashMovementFormModal } from './components/CashMovementFormModal';
import { TransferModal } from './components/TransferModal';
import { reverseKindOf } from './movementActions';
import { csvDateTime } from '../../utils/csv';

const DIRECTIONS = [
  { value: '', label: 'Entradas y salidas' },
  { value: 'in', label: 'Entradas' },
  { value: 'out', label: 'Salidas' },
];

/** El libro de movimientos de caja: consulta, registro, transferencia y anulación (CU-228, 229, 309, 310, 340). */
export const CashMovements = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { cashBoxId: '', direction: '', categoryId: '', from: '', to: '' },
    25,
  );
  const boxes = useCashBoxOptions();
  const categories = useCashCategories({ page: 0, pageSize: 100 }, { includeInactive: true });
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useCashMovements(
    pagination,
    {
      cashBoxId: filters.cashBoxId || undefined,
      direction: (filters.direction || undefined) as CashMovement['direction'] | undefined,
      categoryId: filters.categoryId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    { enabled: !rangeInvalid },
  );
  const reverseMovement = useReverseCashMovement();
  const reverseTransfer = useReverseCashTransfer();
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [reversing, setReversing] = useState<CashMovement | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const boxName = (id: string) => boxes.data?.data.find((b) => b.cashBoxId === id)?.name;
  const categoryName = (id: string) => categories.data?.data.find((c) => c.categoryId === id)?.name;
  const chips = [
    filters.cashBoxId && { key: 'cashBoxId', label: `Caja: ${boxName(filters.cashBoxId) ?? '…'}` },
    filters.direction && { key: 'direction', label: filters.direction === 'in' ? 'Entradas' : 'Salidas' },
    filters.categoryId && { key: 'categoryId', label: `Categoría: ${categoryName(filters.categoryId) ?? '…'}` },
    filters.from && { key: 'from', label: `Desde ${filters.from}` },
    filters.to && { key: 'to', label: `Hasta ${filters.to}` },
  ].filter((c): c is { key: string; label: string } => Boolean(c));

  const reversingKind = reversing ? reverseKindOf(reversing) : null;
  const reversePending = reversingKind === 'transfer' ? reverseTransfer.isPending : reverseMovement.isPending;

  const confirmReverse = (reason: string) => {
    if (!reversing) return;
    const request = { id: reversing.movementId, body: { reason } };
    const options = {
      onSuccess: () => {
        notify.success(reversingKind === 'transfer' ? 'Transferencia anulada' : 'Movimiento anulado');
        setReversing(null);
      },
      onError: (e: unknown) => setServerError(toApiError(e).messages.join('. ')),
    };
    if (reversingKind === 'transfer') reverseTransfer.mutate(request, options);
    else reverseMovement.mutate(request, options);
  };

  const canReverse = (row: CashMovement) => canWrite && reverseKindOf(row) !== null;
  const reverseLabel = (row: CashMovement) => (reverseKindOf(row) === 'transfer' ? 'Anular transferencia' : 'Anular');

  const amount = (row: CashMovement) => (
    <span className={row.direction === 'in' ? 'text-success' : 'text-danger'}>
      {row.direction === 'in' ? '+' : '−'} {formatCurrency(row.amount)}
    </span>
  );

  const state = (row: CashMovement) =>
    row.reversed ? (
      <Badge label={{ text: 'Anulado', tone: 'warn' }} />
    ) : row.reversesMovementId ? (
      <Badge label={{ text: 'Anulación', tone: 'warn' }} />
    ) : (
      <Badge label={labelOf(CASH_REFERENCE, row.referenceType)} />
    );

  const columns: GridColDef<CashMovement>[] = [
    {
      field: 'occurredAt',
      headerName: 'Fecha',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.occurredAt),
    },
    {
      field: 'description',
      headerName: 'Movimiento',
      flex: 1.6,
      minWidth: 260,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.description} subtitle={`${row.cashBoxName} · ${row.categoryName}`} icon={BookOpen} />
      ),
    },
    { field: 'origin', headerName: 'Origen', width: 190, sortable: false, renderCell: ({ row }) => state(row) },
    {
      field: 'amount',
      headerName: 'Importe',
      width: 150,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => <span className="font-mono">{amount(row)}</span>,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`movimiento ${row.description}`}
          actions={
            canReverse(row)
              ? [{ label: reverseLabel(row), icon: Undo2, tone: 'danger', onClick: () => setReversing(row) }]
              : []
          }
        />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Movimientos de caja"
        description="El libro de la plata: solo se agrega, y lo que está mal se anula con otro movimiento."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ArrowLeftRight />}
              disabled={!canWrite}
              title={writeHint}
              onClick={() => setTransferring(true)}
            >
              Transferir
            </Button>
            <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
              Registrar movimiento
            </Button>
          </>
        }
      />
      <FinanceSummary kind="movements" />
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Caja"
            options={[
              { value: '', label: 'Todas las cajas' },
              ...(boxes.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
            ]}
            value={filters.cashBoxId}
            onChange={(e) => setFilters({ cashBoxId: e.target.value })}
          />
          <Select
            label="Sentido"
            options={DIRECTIONS}
            value={filters.direction}
            onChange={(e) => setFilters({ direction: e.target.value })}
          />
          <Select
            label="Categoría"
            options={[
              { value: '', label: 'Todas' },
              ...(categories.data?.data ?? []).map((c) => ({ value: c.categoryId, label: c.name })),
            ]}
            value={filters.categoryId}
            onChange={(e) => setFilters({ categoryId: e.target.value })}
          />
          <Input
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
            error={rangeInvalid ? 'La fecha inicial no puede ser posterior a la final' : undefined}
          />
          <Input label="Hasta" type="date" value={filters.to} onChange={(e) => setFilters({ to: e.target.value })} />
        </div>
        {chips.length > 0 && (
          <div className="border-b border-outline px-4 py-2">
            <FilterChips
              items={chips}
              resultCount={data?.total}
              onRemove={(key) => setFilters({ [key]: '' })}
              onClearAll={() => setFilters({ cashBoxId: '', direction: '', categoryId: '', from: '', to: '' })}
            />
          </div>
        )}
        <div className="flex justify-end border-b border-outline px-4 py-2">
          <ExportCsvButton
            filename="movimientos-de-caja"
            headers={['Fecha', 'Caja', 'Categoría', 'Descripción', 'Sentido', 'Importe', 'Origen']}
            rows={(data?.data ?? []).map((row) => [
              csvDateTime(row.occurredAt),
              row.cashBoxName,
              row.categoryName,
              row.description,
              row.direction === 'in' ? 'Entrada' : 'Salida',
              row.amount,
              row.reversed
                ? 'Anulado'
                : row.reversesMovementId
                  ? 'Anulación'
                  : labelOf(CASH_REFERENCE, row.referenceType).text,
            ])}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Los movimientos" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="movimientos"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.movementId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              chips.length > 0 ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="Todavía no hay movimientos"
                  description="Los ingresos y gastos de las cajas aparecen acá."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={row.description}
                  subtitle={`${row.cashBoxName} · ${row.categoryName}`}
                  icon={BookOpen}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="font-mono">{amount(row)}</strong>
                  {state(row)}
                  <span className="text-xs text-muted">{formatDateTime(row.occurredAt)}</span>
                </div>
                {canReverse(row) && (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => setReversing(row)}>
                      {reverseLabel(row)}
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        )}
      </Card>
      <CashMovementFormModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultCashBoxId={filters.cashBoxId || undefined}
      />
      <TransferModal open={transferring} onClose={() => setTransferring(false)} />
      <ReasonModal
        open={reversing !== null}
        onClose={() => {
          setReversing(null);
          setServerError(null);
        }}
        onConfirm={confirmReverse}
        title={reversingKind === 'transfer' ? 'Anular la transferencia' : 'Anular el movimiento'}
        description={
          !reversing
            ? ''
            : reversingKind === 'transfer'
              ? `Se revierten las dos patas de la transferencia de ${formatCurrency(reversing.amount)}: vuelve al origen y sale del destino. Si el destino ya no tiene ese saldo, no se anula.`
              : `Se asienta un movimiento inverso de ${formatCurrency(reversing.amount)} en ${reversing.cashBoxName}. El original queda en el libro.`
        }
        reasonLabel="Motivo de la anulación"
        confirmLabel={reversingKind === 'transfer' ? 'Anular transferencia' : 'Anular movimiento'}
        serverError={serverError}
        onReasonChange={() => setServerError(null)}
        loading={reversePending}
      />
    </div>
  );
};
