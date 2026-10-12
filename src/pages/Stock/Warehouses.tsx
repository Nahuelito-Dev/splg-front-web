import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Boxes, Plus, Star, Undo2, Warehouse as WarehouseIcon } from 'lucide-react';
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
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Warehouse } from '../../services/api/types';
import { useDeleteWarehouse, useUpdateWarehouse, useWarehouses } from '../../services/queries/stock';
import { confirm, notify } from '../../utils/notifications';
import { WAREHOUSE_KIND, labelOf } from '../../utils/statusLabels';
import { WarehouseFormModal } from './components/WarehouseFormModal';

/** Galpones (depósitos) de la distribuidora: alta, edición, baja lógica y cuál es el predeterminado. */
export const Warehouses = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isPending, error, refetch } = useWarehouses(showInactive);
  const update = useUpdateWarehouse();
  const remove = useDeleteWarehouse();

  const setDefault = async (warehouse: Warehouse) => {
    const ok = await confirm({
      title: '¿Marcar como predeterminado?',
      text: `«${warehouse.name}» pasa a ser el galpón que usa la entrega cuando el camión no tiene stock.`,
    });
    if (!ok) return;
    update.mutate(
      { id: warehouse.warehouseId, body: { isDefault: true } },
      { onSuccess: () => notify.success('Galpón predeterminado actualizado'), onError: notify.error },
    );
  };

  const reactivate = (warehouse: Warehouse) =>
    update.mutate(
      { id: warehouse.warehouseId, body: { isActive: true } },
      { onSuccess: () => notify.success('Galpón reactivado'), onError: notify.error },
    );

  const deactivate = async (warehouse: Warehouse) => {
    const ok = await confirm({
      title: '¿Dar de baja el galpón?',
      text: `«${warehouse.name}» deja de recibir stock. Puede entregar el que le queda y se puede reactivar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(warehouse.warehouseId, {
      onSuccess: () => notify.success('Galpón dado de baja'),
      onError: notify.error,
    });
  };

  const actionsFor = (row: Warehouse) =>
    canWrite
      ? [
          ...(row.isActive && !row.isDefault
            ? [{ label: 'Marcar predeterminado', icon: Star, onClick: () => void setDefault(row) }]
            : []),
          ...(!row.isActive ? [{ label: 'Reactivar', icon: Undo2, onClick: () => reactivate(row) }] : []),
        ]
      : [];

  const statusBadges = (row: Warehouse) => (
    <span className="flex flex-wrap gap-1.5">
      {row.isDefault && <Badge label={{ text: 'Predeterminado', tone: 'primary' }} />}
      <Badge label={row.isActive ? { text: 'Activo', tone: 'success' } : { text: 'Inactivo', tone: 'neutral' }} />
    </span>
  );

  const columns: GridColDef<Warehouse>[] = [
    {
      field: 'name',
      headerName: 'Galpón',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => <IdentityCell title={row.name} subtitle={row.code} icon={WarehouseIcon} monoSubtitle />,
    },
    {
      field: 'kind',
      headerName: 'Tipo',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(WAREHOUSE_KIND, row.kind)} />,
    },
    {
      field: 'address',
      headerName: 'Dirección',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => <span className="truncate text-muted">{row.address ?? '—'}</span>,
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 230,
      sortable: false,
      renderCell: ({ row }) => statusBadges(row),
    },
    {
      field: 'actions',
      headerName: '',
      width: 190,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`galpón ${row.name}`}
          onView={() => navigate(`/stock/warehouses/${row.warehouseId}`)}
          onEdit={canWrite ? () => setEditing(row) : undefined}
          onDelete={canWrite && row.isActive ? () => void deactivate(row) : undefined}
          deleteLabel="Dar de baja"
          actions={actionsFor(row)}
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Galpones"
        description="Dónde guarda la distribuidora sus garrafas. Cada galpón tiene su saldo de llenas, vacías y defectuosas."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nuevo galpón
          </Button>
        }
      />
      <Card>
        <div className="border-b border-outline px-4 py-3">
          <Checkbox
            label="Mostrar galpones dados de baja"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Los galpones" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="galpones"
            rows={data ?? []}
            columns={columns}
            getRowId={(row) => row.warehouseId}
            loading={isPending}
            onRowClick={(row) => navigate(`/stock/warehouses/${row.warehouseId}`)}
            empty={
              <EmptyState
                icon={Boxes}
                title="Todavía no hay galpones"
                description="Creá el primero para empezar a registrar el stock físico."
              />
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={row.name} subtitle={row.code} icon={WarehouseIcon} monoSubtitle />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge label={labelOf(WAREHOUSE_KIND, row.kind)} />
                  {statusBadges(row)}
                </div>
                {row.address && <p className="text-sm text-muted">{row.address}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/stock/warehouses/${row.warehouseId}`)}
                  >
                    Ver ficha
                  </Button>
                  {canWrite && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  )}
                  {canWrite && row.isActive && !row.isDefault && (
                    <Button size="sm" variant="secondary" onClick={() => void setDefault(row)}>
                      Marcar predeterminado
                    </Button>
                  )}
                  {canWrite && !row.isActive && (
                    <Button size="sm" variant="secondary" onClick={() => reactivate(row)}>
                      Reactivar
                    </Button>
                  )}
                  {canWrite && row.isActive && (
                    <Button size="sm" variant="danger" onClick={() => void deactivate(row)}>
                      Dar de baja
                    </Button>
                  )}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <WarehouseFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        warehouse={editing}
      />
    </div>
  );
};
