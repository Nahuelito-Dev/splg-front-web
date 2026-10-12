import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { ClipboardList, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  IdentityCell,
  Input,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useUrlParams } from '../../hooks';
import type { PurchaseOrderSummary } from '../../services/api/types';
import { usePurchaseOrders, useSupplierOptions } from '../../services/queries/purchases';
import { formatCurrency, formatDay } from '../../utils/format';
import { PURCHASE_ORDER_STATUS, labelOf } from '../../utils/statusLabels';
import { PurchaseOrderFormModal } from './components/PurchaseOrderFormModal';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...(Object.keys(PURCHASE_ORDER_STATUS) as PurchaseOrderSummary['status'][]).map((s) => ({
    value: s,
    label: PURCHASE_ORDER_STATUS[s].text,
  })),
];

/** Órdenes de compra: el listado con su avance (pedido, recibido, pendiente) y el alta. */
export const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters] = useUrlParams({ status: '', supplier: '', from: '', to: '' });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [creating, setCreating] = useState(false);
  const suppliers = useSupplierOptions();
  const { data, isFetching, error, refetch } = usePurchaseOrders(pagination, {
    status: (filters.status || undefined) as PurchaseOrderSummary['status'] | undefined,
    supplierId: filters.supplier || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
  const goTo = (row: PurchaseOrderSummary) =>
    navigate(`/purchases/orders/${row.purchaseOrderId}`, { state: FROM_LIST_STATE });
  const change = (patch: Partial<typeof filters>) => {
    setPagination((p) => ({ ...p, page: 0 }));
    setFilters(patch);
  };
  const supplierName =
    (suppliers.data?.data ?? []).find((s) => s.supplierId === filters.supplier)?.businessName ?? 'Proveedor';
  const chips = [
    ...(filters.status
      ? [
          {
            key: 'status',
            label: labelOf(PURCHASE_ORDER_STATUS, filters.status as PurchaseOrderSummary['status']).text,
          },
        ]
      : []),
    ...(filters.supplier ? [{ key: 'supplier', label: supplierName }] : []),
    ...(filters.from ? [{ key: 'from', label: `Desde ${filters.from}` }] : []),
    ...(filters.to ? [{ key: 'to', label: `Hasta ${filters.to}` }] : []),
  ];

  const progress = (row: PurchaseOrderSummary) =>
    `${row.receivedQuantity} de ${row.orderedQuantity} recibidas${row.pendingQuantity > 0 ? ` · faltan ${row.pendingQuantity}` : ''}`;

  const columns: GridColDef<PurchaseOrderSummary>[] = [
    {
      field: 'number',
      headerName: 'Orden',
      flex: 1.2,
      minWidth: 230,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={`N° ${row.number} · ${row.supplierName}`}
          subtitle={row.destinationWarehouseName}
          icon={ClipboardList}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 200,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(PURCHASE_ORDER_STATUS, row.status)} />,
    },
    {
      field: 'progress',
      headerName: 'Avance',
      flex: 1,
      minWidth: 200,
      sortable: false,
      valueGetter: ({ row }) => progress(row),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <span className="font-mono font-semibold">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`orden ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Órdenes de compra"
        description="Lo que se le pide a cada proveedor y cuánto de eso ya llegó."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva orden
          </Button>
        }
      />
      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => change({ status: e.target.value })}
          />
          <Select
            label="Proveedor"
            options={[
              { value: '', label: 'Todos los proveedores' },
              ...(suppliers.data?.data ?? []).map((s) => ({ value: s.supplierId, label: s.businessName })),
            ]}
            hint={suppliers.isError ? 'No se pudieron cargar los proveedores' : undefined}
            value={filters.supplier}
            onChange={(e) => change({ supplier: e.target.value })}
          />
          <Input label="Desde" type="date" value={filters.from} onChange={(e) => change({ from: e.target.value })} />
          <Input label="Hasta" type="date" value={filters.to} onChange={(e) => change({ to: e.target.value })} />
        </div>
        {chips.length > 0 && (
          <div className="border-b border-outline px-4 py-3">
            <FilterChips
              items={chips}
              resultCount={data?.total}
              onRemove={(key) => change({ [key]: '' })}
              onClearAll={() => change({ status: '', supplier: '', from: '', to: '' })}
            />
          </div>
        )}
        {error ? (
          <ErrorState error={error} resource="Las órdenes" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="órdenes"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.purchaseOrderId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={goTo}
            empty={
              chips.length > 0 ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Todavía no hay órdenes de compra"
                  description="Creá la primera para pedirle garrafas a un proveedor."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={`N° ${row.number} · ${row.supplierName}`}
                  subtitle={row.destinationWarehouseName}
                  icon={ClipboardList}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge label={labelOf(PURCHASE_ORDER_STATUS, row.status)} />
                  <span className="font-mono font-semibold">{formatCurrency(row.totalAmount)}</span>
                </div>
                <p className="text-sm text-muted">{progress(row)}</p>
                {row.expectedDate && <p className="text-xs text-muted">Esperada el {formatDay(row.expectedDate)}</p>}
                <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                  Ver orden
                </Button>
              </>
            )}
          />
        )}
      </Card>
      <PurchaseOrderFormModal
        open={creating}
        onClose={() => setCreating(false)}
        order={null}
        onSaved={(order) => navigate(`/purchases/orders/${order.purchaseOrderId}`)}
      />
    </div>
  );
};
