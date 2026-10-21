import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { BookOpen, Lock, LockOpen, Plus, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  PageContainer,
  TableToolbar,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { CashBox } from '../../services/api/types';
import { useCashBoxes } from '../../services/queries/finance';
import { formatCurrency } from '../../utils/format';
import { CASH_BOX_KIND, labelOf } from '../../utils/statusLabels';
import { FinanceSummary } from './components/FinanceSummary';
import { CashBoxFormModal } from './components/CashBoxFormModal';
import { CloseSessionModal } from './components/CloseSessionModal';
import { OpenSessionModal } from './components/OpenSessionModal';

const KIND_FILTER = [
  { value: '', label: 'Todos los tipos' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
  { value: 'wallet', label: 'Billetera' },
];

/** Cajas de la distribuidora: saldo, apertura y cierre con arqueo (CU-225, 226, 227, 264). */
export const CashBoxes = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ kind: '', inactive: '' }, 10);
  const { data, isFetching, error, refetch } = useCashBoxes(pagination, {
    kind: (filters.kind || undefined) as CashBox['kind'] | undefined,
    includeInactive: filters.inactive === '1',
  });
  const [editing, setEditing] = useState<CashBox | null>(null);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState<CashBox | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const filtered = Boolean(filters.kind || filters.inactive);

  const status = (row: CashBox) =>
    !row.isActive ? (
      <Badge label={{ text: 'Desactivada', tone: 'neutral' }} />
    ) : row.requiresSession ? (
      <Badge label={row.openSessionId ? { text: 'Abierta', tone: 'success' } : { text: 'Cerrada', tone: 'warn' }} />
    ) : (
      <Badge label={{ text: 'Sin sesión', tone: 'neutral' }} />
    );

  const sessionActions = (row: CashBox) => {
    if (!canWrite || !row.isActive || !row.requiresSession) return [];
    const sessionId = row.openSessionId;
    return sessionId
      ? [{ label: 'Cerrar con arqueo', icon: Lock, onClick: () => setClosing(sessionId) }]
      : [{ label: 'Abrir caja', icon: LockOpen, onClick: () => setOpening(row) }];
  };

  const goToDetails = (row: CashBox) => navigate(`/finance/boxes/${row.cashBoxId}`);
  const goToMovements = (row: CashBox) => navigate(`/finance/movements?cashBoxId=${row.cashBoxId}`);

  const columns: GridColDef<CashBox>[] = [
    {
      field: 'name',
      headerName: 'Caja',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.name} subtitle={labelOf(CASH_BOX_KIND, row.kind).text} icon={Wallet} />
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 150,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.balance),
    },
    { field: 'status', headerName: 'Estado', width: 130, sortable: false, renderCell: ({ row }) => status(row) },
    {
      field: 'actions',
      headerName: '',
      width: 170,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`caja ${row.name}`}
          onView={() => goToDetails(row)}
          onEdit={canWrite ? () => setEditing(row) : undefined}
          actions={[
            { label: 'Ver movimientos', icon: BookOpen, onClick: () => goToMovements(row) },
            ...sessionActions(row),
          ]}
        />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Cajas"
        description="El efectivo, los bancos y las billeteras de la distribuidora, con su saldo según el libro."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva caja
          </Button>
        }
      />
      <FinanceSummary kind="boxes" />
      <Card>
        <TableToolbar
          filters={
            <>
              <Select
                label="Tipo"
                options={KIND_FILTER}
                value={filters.kind}
                onChange={(e) => setFilters({ kind: e.target.value })}
              />
              <Checkbox
                label="Ver desactivadas"
                checked={filters.inactive === '1'}
                onChange={(e) => setFilters({ inactive: e.target.checked ? '1' : '' })}
              />
            </>
          }
          csv={{
            filename: 'cajas',
            headers: ['Caja', 'Tipo', 'Saldo', 'Estado'],
            rows: (data?.data ?? []).map((row) => [
              row.name,
              labelOf(CASH_BOX_KIND, row.kind).text,
              row.balance,
              !row.isActive
                ? 'Desactivada'
                : row.requiresSession
                  ? row.openSessionId
                    ? 'Abierta'
                    : 'Cerrada'
                  : 'Sin sesión',
            ]),
          }}
          noun={['caja', 'cajas']}
        />
        {error ? (
          <ErrorState error={error} resource="Las cajas" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="cajas"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.cashBoxId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={goToDetails}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
              ) : (
                <EmptyState
                  icon={Wallet}
                  title="Todavía no hay cajas"
                  description="Creá la primera para empezar a registrar movimientos."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={row.name} subtitle={labelOf(CASH_BOX_KIND, row.kind).text} icon={Wallet} />
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="font-mono text-lg">{formatCurrency(row.balance)}</strong>
                  {status(row)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => goToDetails(row)}>
                    Ver ficha
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => goToMovements(row)}>
                    Movimientos
                  </Button>
                  {canWrite && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  )}
                  {sessionActions(row).map((a) => (
                    <Button key={a.label} size="sm" variant="secondary" onClick={a.onClick}>
                      {a.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <CashBoxFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        cashBox={editing}
      />
      <OpenSessionModal open={opening !== null} onClose={() => setOpening(null)} cashBox={opening} />
      <CloseSessionModal open={closing !== null} onClose={() => setClosing(null)} sessionId={closing} />
    </PageContainer>
  );
};
