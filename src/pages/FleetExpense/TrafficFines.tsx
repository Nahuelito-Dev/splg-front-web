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
  PageHeader,
  ReasonModal,
  ResponsiveTable,
  RowActions,
  Select,
  StatusFilterTabs,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams, useUrlParam } from '../../hooks';
import { trafficFineQuery } from '../../services/api/fleetExpense';
import type { TrafficFineV2 } from '../../services/api/types';
import {
  useTrafficFines,
  useUpdateTrafficFine,
  useVoidTrafficFine,
  useTrafficFineStatusCounts,
} from '../../services/queries/fleetExpense';
import { formatCurrency, formatDay } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { TRAFFIC_FINE_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { ChargeFineModal } from './components/ChargeFineModal';
import { PayFineModal } from './components/PayFineModal';
import { TrafficFineDrawer } from './components/TrafficFineDrawer';
import { TrafficFineFormModal } from './components/TrafficFineFormModal';
import { useCarOptions } from './components/useCarOptions';

const isOpen = (fine: TrafficFineV2) => fine.status === 'pending' || fine.status === 'appealed';

/** Las multas de tránsito de la flota (CU-198 a CU-200, CU-323 a CU-325): registrar, apelar, pagar, imputar y anular. */
export const TrafficFines = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { car: '', status: '', from: '', to: '' },
    10,
  );
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(TRAFFIC_FINE_STATUS, filters.status);
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TrafficFineV2 | null>(null);
  const [paying, setPaying] = useState<TrafficFineV2 | null>(null);
  const [charging, setCharging] = useState<TrafficFineV2 | null>(null);
  const [voiding, setVoiding] = useState<TrafficFineV2 | null>(null);
  // La multa abierta también vive en la URL (`?fine=<id>`): el aviso de la bandeja lleva directo a ella.
  const [fineParam, setFineParam] = useUrlParam('fine', '');
  const viewing = fineParam || null;
  const setViewing = (id: string | null) => setFineParam(id ?? '');
  const update = useUpdateTrafficFine();
  const voidFine = useVoidTrafficFine();
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const listFilters = {
    carId: filters.car || undefined,
    status: status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const { data, isFetching, error, refetch } = useTrafficFines(pagination, listFilters, { enabled: !rangeInvalid });
  const filtered = Boolean(filters.car || status || filters.from || filters.to);
  useClampPage(pagination, data?.total, setPagination);

  const appeal = (fine: TrafficFineV2) =>
    update.mutate(
      { id: fine.fineId, body: { appeal: true } },
      { onSuccess: () => notify.success('Multa apelada'), onError: notify.error },
    );

  const actionsOf = (row: TrafficFineV2) =>
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

  const state = (row: TrafficFineV2) => (
    <div className="flex flex-wrap gap-1.5">
      <Badge label={labelOf(TRAFFIC_FINE_STATUS, row.status)} />
      {row.chargedToEmployee && <Badge label={{ text: 'Imputada', tone: 'accent' }} />}
    </div>
  );

  const statusCounts = useTrafficFineStatusCounts(
    {
      carId: filters.car || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    !rangeInvalid,
  );

  const columns: GridColDef<TrafficFineV2>[] = [
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
    <PageContainer>
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
        <StatusFilterTabs
          options={statusOptions(TRAFFIC_FINE_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar multas por estado"
          idPrefix="traffic-fines"
        >
          <TableToolbar
            resultCount={data?.total}
            filters={
              <>
                <Select
                  label="Vehículo"
                  options={carOptions}
                  value={filters.car}
                  onChange={(e) => setFilters({ car: e.target.value })}
                />
                <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => setFilters({ ...range })} />
              </>
            }
            serverExport={{
              resource: 'multas',
              params: trafficFineQuery(listFilters),
              blockedReason: rangeInvalid ? 'El rango de fechas es inválido' : undefined,
            }}
            noun={['multa', 'multas']}
          >
            {rangeInvalid && (
              <p role="alert" className="text-xs text-danger">
                {'Es anterior al inicio'}
              </p>
            )}
          </TableToolbar>
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
        </StatusFilterTabs>
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
    </PageContainer>
  );
};
