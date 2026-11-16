import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { PackageCheck, Plus } from 'lucide-react';
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
import { purchaseReceiptQuery } from '../../services/api/purchases';
import type { PurchaseReceiptSummary } from '../../services/api/types';
import {
  usePurchaseReceipts,
  useSupplierOptions,
  usePurchaseReceiptStatusCounts,
} from '../../services/queries/purchases';
import { formatCurrency, formatDateTime } from '../../utils/format';
import {
  RECEIPT_PAYMENT,
  RECEIPT_STATUS,
  SUPPLIER_DOCUMENT_TYPE,
  labelOf,
  statusOptions,
  statusParam,
} from '../../utils/statusLabels';
import { PurchaseReceiptFormModal } from './components/PurchaseReceiptFormModal';

const PAYMENT_OPTIONS = [
  { value: '', label: 'Pagadas o no' },
  { value: 'unpaid', label: 'Sin pagar' },
  { value: 'paid', label: 'Pagadas' },
];

/** Recepciones de mercadería, con o sin orden de compra. */
export const PurchaseReceipts = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { status: '', payment: '', supplier: '', from: '', to: '' },
    10,
  );
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(RECEIPT_STATUS, filters.status);
  const [creating, setCreating] = useState(false);
  const suppliers = useSupplierOptions();
  // Un rango invertido (desde > hasta) no se consulta: ni el listado ni los contadores.
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const listFilters = {
    status: status || undefined,
    paymentStatus: (filters.payment || undefined) as PurchaseReceiptSummary['paymentStatus'] | undefined,
    supplierId: filters.supplier || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
  const { data, isFetching, error, refetch } = usePurchaseReceipts(pagination, listFilters, { enabled: !rangeInvalid });
  const goTo = (row: PurchaseReceiptSummary) =>
    navigate(`/purchases/receipts/${row.receiptId}`, { state: FROM_LIST_STATE });
  const change = (patch: Partial<typeof filters>) => {
    setFilters(patch);
  };
  const supplierName =
    (suppliers.data?.data ?? []).find((s) => s.supplierId === filters.supplier)?.businessName ?? 'Proveedor';
  const chips = [
    ...(filters.payment
      ? [{ key: 'payment', label: PAYMENT_OPTIONS.find((o) => o.value === filters.payment)?.label ?? filters.payment }]
      : []),
    ...(filters.supplier ? [{ key: 'supplier', label: supplierName }] : []),
    ...(filters.from ? [{ key: 'from', label: `Desde ${filters.from}` }] : []),
    ...(filters.to ? [{ key: 'to', label: `Hasta ${filters.to}` }] : []),
  ];
  const doc = (row: PurchaseReceiptSummary) =>
    `${labelOf(SUPPLIER_DOCUMENT_TYPE, row.supplierDocumentType).text} ${row.supplierDocumentNumber}`;
  const badges = (row: PurchaseReceiptSummary) => (
    <span className="flex flex-col items-start gap-0.5">
      <Badge label={labelOf(RECEIPT_STATUS, row.status)} />
      <span className="text-xs text-muted">{labelOf(RECEIPT_PAYMENT, row.paymentStatus).text}</span>
    </span>
  );

  const statusCounts = usePurchaseReceiptStatusCounts(
    {
      paymentStatus: (filters.payment || undefined) as PurchaseReceiptSummary['paymentStatus'] | undefined,
      supplierId: filters.supplier || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    !rangeInvalid,
  );

  const columns: GridColDef<PurchaseReceiptSummary>[] = [
    {
      field: 'number',
      headerName: 'Recepción',
      flex: 1.2,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={`N° ${row.number} · ${row.supplierName}`}
          subtitle={`${formatDateTime(row.receivedAt)} · ${row.warehouseName}`}
          icon={PackageCheck}
        />
      ),
    },
    {
      field: 'doc',
      headerName: 'Documento',
      flex: 1,
      minWidth: 170,
      sortable: false,
      valueGetter: ({ row }) =>
        `${doc(row)}${row.purchaseOrderNumber ? ` · orden N° ${row.purchaseOrderNumber}` : ' · sin orden'}`,
    },
    {
      field: 'totalAmount',
      headerName: 'Importe',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <span className="tabular-nums font-semibold">{formatCurrency(row.totalAmount)}</span>,
    },
    { field: 'status', headerName: 'Estado', width: 160, sortable: false, renderCell: ({ row }) => badges(row) },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`recepción ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Recepciones"
        description="Cada remito o factura del proveedor: las llenas que entran, las vacías que se lleva la planta y el costo."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Compra directa
          </Button>
        }
      />
      <Card>
        <StatusFilterTabs
          options={statusOptions(RECEIPT_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar recepciones por estado"
          idPrefix="purchase-receipts"
        >
          <TableToolbar
            filters={
              <>
                <Select
                  label="Pago"
                  options={PAYMENT_OPTIONS}
                  value={filters.payment}
                  onChange={(e) => change({ payment: e.target.value })}
                />
                <Select
                  label="Proveedor"
                  options={[
                    { value: '', label: 'Todos' },
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
              resource: 'recepciones',
              params: purchaseReceiptQuery(listFilters),
              blockedReason: rangeInvalid ? 'El rango de fechas es inválido' : undefined,
            }}
            chips={chips}
            onRemoveChip={(key) => change({ [key]: '' })}
            onClearChips={() => change({ status: '', payment: '', supplier: '', from: '', to: '' })}
            resultCount={data?.total}
            noun={['recepción', 'recepciones']}
          >
            {rangeInvalid && (
              <p role="alert" className="text-xs text-danger">
                {'Es anterior al inicio'}
              </p>
            )}
          </TableToolbar>
          {error ? (
            <ErrorState error={error} resource="Las recepciones" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="recepciones"
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.receiptId}
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={goTo}
              empty={
                chips.length > 0 || status ? (
                  <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
                ) : (
                  <EmptyState
                    icon={PackageCheck}
                    title="Todavía no hay recepciones"
                    description="Se registran desde una orden de compra o como compra directa."
                  />
                )
              }
              renderCard={(row) => (
                <>
                  <IdentityCell
                    title={`N° ${row.number} · ${row.supplierName}`}
                    subtitle={formatDateTime(row.receivedAt)}
                    icon={PackageCheck}
                  />
                  <p className="text-sm text-muted">
                    {doc(row)} · {formatCurrency(row.totalAmount)}
                  </p>
                  {badges(row)}
                  <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                    Ver recepción
                  </Button>
                </>
              )}
            />
          )}
        </StatusFilterTabs>
      </Card>
      <PurchaseReceiptFormModal
        open={creating}
        onClose={() => setCreating(false)}
        order={null}
        onSaved={(receipt) => navigate(`/purchases/receipts/${receipt.receiptId}`)}
      />
    </PageContainer>
  );
};
