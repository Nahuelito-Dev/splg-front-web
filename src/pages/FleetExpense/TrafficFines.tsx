import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Ban, Gavel, HandCoins, Plus, ShieldAlert, UserRoundCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  Input,
  PageHeader,
  ReasonModal,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { TrafficFine } from '../../services/api/types';
import { useTrafficFines, useUpdateTrafficFine, useVoidTrafficFine } from '../../services/queries/fleetExpense';
import { formatCurrency, formatDay } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { TRAFFIC_FINE_STATUS, labelOf } from '../../utils/statusLabels';
import { ChargeFineModal } from './components/ChargeFineModal';
import { PayFineModal } from './components/PayFineModal';
import { TrafficFineDrawer } from './components/TrafficFineDrawer';
import { TrafficFineFormModal } from './components/TrafficFineFormModal';
import { useCarOptions } from './components/useCarOptions';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'appealed', label: 'Apeladas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'voided', label: 'Anuladas' },
];

const isOpen = (fine: TrafficFine) => fine.status === 'pending' || fine.status === 'appealed';

/** Las multas de tránsito de la flota (CU-198 a CU-200, CU-323 a CU-325): registrar, apelar, pagar, imputar y anular. */
export const TrafficFines = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { car: '', status: '', from: '', to: '' },
    10,
  );
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TrafficFine | null>(null);
  const [paying, setPaying] = useState<TrafficFine | null>(null);
  const [charging, setCharging] = useState<TrafficFine | null>(null);
  const [voiding, setVoiding] = useState<TrafficFine | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const update = useUpdateTrafficFine();
  const voidFine = useVoidTrafficFine();
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useTrafficFines(
    pagination,
    {
      carId: filters.car || undefined,
      status: (filters.status || undefined) as TrafficFine['status'] | undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    { enabled: !rangeInvalid },
  );
  const filtered = Boolean(filters.car || filters.status || filters.from || filters.to);
  useClampPage(pagination, data?.total, setPagination);

  const appeal = (fine: TrafficFine) =>
    update.mutate(
      { id: fine.fineId, body: { appeal: true } },
      { onSuccess: () => notify.success('Multa apelada'), onError: notify.error },
    );

  const actionsOf = (row: TrafficFine) =>
    !canWrite
      ? []
      : [
          ...(row.status === 'pending' ? [{ label: 'Apelar', icon: ShieldAlert, onClick: () => appeal(row) }] : []),
          ...(isOpen(row) ? [{ label: 'Registrar pago', icon: HandCoins, onClick: () => setPaying(row) }] : []),
          ...(row.status !== 'voided' && !row.chargedToEmployee
            ? [{ label: 'Imputar al chofer', icon: UserRoundCheck, onClick: () => setCharging(row) }]
            : []),
          ...(isOpen(row)
            ? [{ label: 'Anular', icon: Ban, tone: 'danger' as const, onClick: () => setVoiding(row) }]
            : []),
        ];

  const state = (row: TrafficFine) => (
    <div className="flex flex-wrap gap-1.5">
      <Badge label={labelOf(TRAFFIC_FINE_STATUS, row.status)} />
      {row.chargedToEmployee && <Badge label={{ text: 'Imputada', tone: 'accent' }} />}
    </div>
  );

  const columns: GridColDef<TrafficFine>[] = [
    {
      field: 'fine',
      headerName: 'Multa',
      flex: 1.3,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={`Acta ${row.actNumber}`} subtitle={row.jurisdiction} icon={Gavel} />
      ),
    },
    {
      field: 'car',
      headerName: 'Vehículo',
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: ({ row }) => `${row.carPatent ?? '—'} · ${row.employeeName ?? 'Sin responsable'}`,
    },
    {
      field: 'amount',
      headerName: 'Importe',
      width: 120,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row.amount),
    },
    {
      field: 'dueDate',
      headerName: 'Vence',
      width: 130,
      sortable: false,
      valueGetter: ({ row }) => formatDay(row.dueDate),
    },
    { field: 'status', headerName: 'Estado', width: 190, sortable: false, renderCell: ({ row }) => state(row) },
    {
      field: 'actions',
      headerName: '',
      width: 150,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`multa ${row.actNumber}`}
          onView={() => setViewing(row.fineId)}
          onEdit={canWrite && isOpen(row) ? () => setEditing(row) : undefined}
          actions={actionsOf(row)}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Multas"
        description="Las multas de tránsito de los vehículos. Una pagada sin imputar al chofer cuenta en el costo del vehículo."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva multa
          </Button>
        }
      />
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-4">
          <Select
            label="Vehículo"
            options={carOptions}
            value={filters.car}
            onChange={(e) => setFilters({ car: e.target.value })}
          />
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
          />
          <Input
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.to}
            error={rangeInvalid ? 'Es anterior al inicio' : undefined}
            onChange={(e) => setFilters({ to: e.target.value })}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Las multas" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="multas"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.fineId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={(row) => setViewing(row.fineId)}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
              ) : (
                <EmptyState
                  icon={Gavel}
                  title="Todavía no hay multas"
                  description="Registrá la primera cuando llegue un acta."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={`Acta ${row.actNumber}`} subtitle={row.jurisdiction} icon={Gavel} />
                <p className="text-sm text-ink-2">
                  {row.carPatent ?? '—'} · {formatCurrency(row.amount)} · vence {formatDay(row.dueDate)}
                </p>
                {state(row)}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setViewing(row.fineId)}>
                    Ver
                  </Button>
                  {actionsOf(row).map((a) => (
                    <Button key={a.label} size="sm" variant="secondary" onClick={a.onClick}>
                      {a.label}
                    </Button>
                  ))}
                  {canWrite && isOpen(row) && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  )}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <TrafficFineFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        fine={editing}
      />
      <PayFineModal fine={paying} onClose={() => setPaying(null)} />
      <ChargeFineModal fine={charging} onClose={() => setCharging(null)} />
      <ReasonModal
        open={voiding !== null}
        onClose={() => setVoiding(null)}
        title="Anular la multa"
        description={`Acta ${voiding?.actNumber ?? ''}: deja de contar como pendiente y de avisarse. Se conserva con su motivo y no vuelve atrás.`}
        confirmLabel="Anular multa"
        loading={voidFine.isPending}
        onConfirm={(reason) =>
          voidFine.mutate(
            { id: voiding?.fineId ?? '', body: { reason } },
            {
              onSuccess: () => {
                notify.success('Multa anulada');
                setVoiding(null);
              },
              onError: notify.error,
            },
          )
        }
      />
      <TrafficFineDrawer fineId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};
