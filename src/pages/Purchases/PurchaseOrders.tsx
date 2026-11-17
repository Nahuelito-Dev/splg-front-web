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
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  StatusFilterTabs,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useClampPage, useUrlPagedParams } from '../../hooks';
import { purchaseOrderQuery } from '../../services/api/purchases';
import type { PurchaseOrderSummary } from '../../services/api/types';
import { usePurchaseOrders, useSupplierOptions, usePurchaseOrderStatusCounts } from '../../services/queries/purchases';
import { formatCurrency, formatDay } from '../../utils/format';
import { PURCHASE_ORDER_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { PurchaseOrderFormModal } from './components/PurchaseOrderFormModal';

/** Órdenes de compra: el listado con su avance (pedido, recibido, pendiente) y el alta. */
export const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { status: '', supplier: '', from: '', to: '' },
    10,
  );
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(PURCHASE_ORDER_STATUS, filters.status);
  const [creating, setCreating] = useState(false);
  const suppliers = useSupplierOptions();
  // Un rango invertido (desde > hasta) no se consulta: ni el listado ni los contadores.
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const listFilters = {
    status: status || undefined,
    supplierId: filters.supplier || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const { data, isFetching, error, refetch } = usePurchaseOrders(pagination, listFilters, { enabled: !rangeInvalid });
  const goTo = (row: PurchaseOrderSummary) =>
    navigate(`/purchases/orders/${row.purchaseOrderId}`, { state: FROM_LIST_STATE });
  const change = (patch: Partial<typeof filters>) => {
    setFilters(patch);
  };
  const supplierName =
    (suppliers.data?.data ?? []).find((s) => s.supplierId === filters.supplier)?.businessName ?? 'Proveedor';
  const chips = [
    ...(filters.supplier ? [{ key: 'supplier', label: supplierName }] : []),
    ...(filters.from ? [{ key: 'from', label: `Desde ${filters.from}` }] : []),
    ...(filters.to ? [{ key: 'to', label: `Hasta ${filters.to}` }] : []),
  ];

  const progress = (row: PurchaseOrderSummary) =>
    `${row.receivedQuantity} de ${row.orderedQuantity} recibidas${row.pendingQuantity > 0 ? ` · faltan ${row.pendingQuantity}` : ''}`;

  const statusCounts = usePurchaseOrderStatusCounts(
    {
      supplierId: filters.supplier || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    !rangeInvalid,
  );

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
      renderCell: ({ row }) => <span className="tabular-nums font-semibold">{formatCurrency(row.totalAmount)}</span>,
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

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
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
        <StatusFilterTabs
          options={statusOptions(PURCHASE_ORDER_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar órdenes por estado"
          idPrefix="purchase-orders"
        >
          <TableToolbar
            filters={
              <>
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
                <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => change({ ...range })} />
              </>
            }
            serverExport={{
              resource: 'ordenes-compra',
              params: purchaseOrderQuery(listFilters),
              blockedReason: rangeInvalid ? 'El rango de fechas es inválido' : undefined,
            }}
            chips={chips}
            onRemoveChip={(key) => change({ [key]: '' })}
            onClearChips={() => change({ status: '', supplier: '', from: '', to: '' })}
            resultCount={data?.total}
            noun={['orden', 'órdenes']}
          >
            {rangeInvalid && (
              <p role="alert" className="text-xs text-danger">
                {'Es anterior al inicio'}
              </p>
            )}
          </TableToolbar>
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
                chips.length > 0 || status ? (
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
                    <span className="tabular-nums font-semibold">{formatCurrency(row.totalAmount)}</span>
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
        </StatusFilterTabs>
      </Card>
      <PurchaseOrderFormModal
        open={creating}
        onClose={() => setCreating(false)}
        order={null}
        onSaved={(order) => navigate(`/purchases/orders/${order.purchaseOrderId}`)}
      />
    </PageContainer>
  );
};
