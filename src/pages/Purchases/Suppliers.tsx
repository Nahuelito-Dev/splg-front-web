import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Building2, Plus, Undo2 } from 'lucide-react';
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
  TableToolbar,
  Select,
  PageContainer,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useDebounce, usePermissions, useClampPage, useUrlPagedParams } from '../../hooks';
import { supplierQuery } from '../../services/api/purchases';
import type { Supplier } from '../../services/api/types';
import { useDeleteSupplier, useSuppliers, useUpdateSupplier } from '../../services/queries/purchases';
import { formatCuit } from '../../utils/cuit';
import { confirm, notify } from '../../utils/notifications';
import { SUPPLIER_KIND, labelOf } from '../../utils/statusLabels';
import { SupplierFormModal } from './components/SupplierFormModal';

const KIND_FILTER = [
  { value: '', label: 'Todos los tipos' },
  { value: 'filling_plant', label: 'Planta fraccionadora' },
  { value: 'other', label: 'Otro' },
];

/** Proveedores: alta, edición, baja lógica y el historial de compras de cada uno. */
export const Suppliers = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ q: '', kind: '', inactive: '' }, 10);
  const term = useDebounce(filters.q, 300);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const listFilters = {
    term: term || undefined,
    kind: (filters.kind || undefined) as Supplier['kind'] | undefined,
    includeInactive: filters.inactive === '1',
  };
  const { data, isFetching, error, refetch } = useSuppliers(pagination, listFilters);
  const update = useUpdateSupplier();
  const remove = useDeleteSupplier();
  const filtered = Boolean(filters.q || filters.kind || filters.inactive);

  const goTo = (row: Supplier) => navigate(`/purchases/suppliers/${row.supplierId}`, { state: FROM_LIST_STATE });
  const change = (patch: Partial<typeof filters>) => {
    setFilters(patch);
  };

  const deactivate = async (supplier: Supplier) => {
    const ok = await confirm({
      title: '¿Dar de baja al proveedor?',
      text: `«${supplier.businessName}» deja de aparecer para comprar. Su historial se conserva y se puede reactivar.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(supplier.supplierId, {
      onSuccess: () => notify.success('Proveedor dado de baja'),
      onError: notify.error,
    });
  };
  const reactivate = (supplier: Supplier) =>
    update.mutate(
      { id: supplier.supplierId, body: { isActive: true } },
      { onSuccess: () => notify.success('Proveedor reactivado'), onError: notify.error },
    );

  const status = (row: Supplier) => (
    <Badge label={row.isActive ? { text: 'Activo', tone: 'success' } : { text: 'De baja', tone: 'neutral' }} />
  );

  const columns: GridColDef<Supplier>[] = [
    {
      field: 'businessName',
      headerName: 'Proveedor',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.businessName} subtitle={`CUIT ${formatCuit(row.cuit)}`} icon={Building2} />
      ),
    },
    {
      field: 'kind',
      headerName: 'Tipo',
      width: 190,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(SUPPLIER_KIND, row.kind)} />,
    },
    {
      field: 'contact',
      headerName: 'Contacto',
      flex: 1,
      minWidth: 160,
      sortable: false,
      valueGetter: ({ row }) => row.contactName ?? row.phone ?? row.email ?? '—',
    },
    { field: 'status', headerName: 'Estado', width: 110, sortable: false, renderCell: ({ row }) => status(row) },
    {
      field: 'actions',
      headerName: '',
      width: 190,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`proveedor ${row.businessName}`}
          onView={() => goTo(row)}
          onEdit={canWrite ? () => setEditing(row) : undefined}
          onDelete={canWrite && row.isActive ? () => void deactivate(row) : undefined}
          deleteLabel="Dar de baja"
          actions={
            canWrite && !row.isActive ? [{ label: 'Reactivar', icon: Undo2, onClick: () => reactivate(row) }] : []
          }
        />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Proveedores"
        description="Las plantas y empresas a las que se les compran garrafas."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nuevo proveedor
          </Button>
        }
      />
      <Card>
        <TableToolbar
          search={{
            label: 'Buscar proveedores',
            placeholder: 'Razón social o CUIT',
            value: filters.q,
            onChange: (value) => change({ q: value }),
          }}
          filters={
            <>
              <Select
                label="Tipo"
                options={KIND_FILTER}
                value={filters.kind}
                onChange={(e) => change({ kind: e.target.value })}
              />
              <Checkbox
                label="Ver dados de baja"
                checked={filters.inactive === '1'}
                onChange={(e) => change({ inactive: e.target.checked ? '1' : '' })}
              />
            </>
          }
          serverExport={{ resource: 'proveedores', params: supplierQuery(listFilters) }}
          resultCount={data?.total}
          noun={['proveedor', 'proveedores']}
        />
        {error ? (
          <ErrorState error={error} resource="Los proveedores" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="proveedores"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.supplierId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={goTo}
            empty={
              filtered ? (
                <EmptyState
                  illustration="search"
                  title="Sin resultados"
                  description="Probá con otra búsqueda o filtro."
                />
              ) : (
                <EmptyState
                  icon={Building2}
                  title="Todavía no hay proveedores"
                  description="Cargá el primero para empezar a comprar."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={row.businessName} subtitle={`CUIT ${formatCuit(row.cuit)}`} icon={Building2} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={labelOf(SUPPLIER_KIND, row.kind)} />
                  {status(row)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                    Ver ficha
                  </Button>
                  {canWrite && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  )}
                  {canWrite && row.isActive && (
                    <Button size="sm" variant="danger" onClick={() => void deactivate(row)}>
                      Dar de baja
                    </Button>
                  )}
                  {canWrite && !row.isActive && (
                    <Button size="sm" variant="secondary" onClick={() => reactivate(row)}>
                      Reactivar
                    </Button>
                  )}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <SupplierFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        supplier={editing}
      />
    </PageContainer>
  );
};
