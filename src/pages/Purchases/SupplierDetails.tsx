import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  ResponsiveTable,
  PageContainer,
  DateRangeFilter,
  CardHeader,
  LinkedEntityPhoto,
} from '../../common/components/ui';
import { useBackToList, usePermissions, useClampPage, useUrlPagedParams } from '../../hooks';
import type { PurchaseReceiptSummary } from '../../services/api/types';
import { useSupplier, useSupplierHistory } from '../../services/queries/purchases';
import { formatCuit } from '../../utils/cuit';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format';
import {
  RECEIPT_PAYMENT,
  RECEIPT_STATUS,
  SUPPLIER_DOCUMENT_TYPE,
  SUPPLIER_KIND,
  labelOf,
} from '../../utils/statusLabels';
import { Banknote, Flame, Receipt } from 'lucide-react';
import { SupplierFormModal } from './components/SupplierFormModal';

/** La ficha de un proveedor: sus datos y el historial de lo que se le compró. */
export const SupplierDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/purchases/suppliers');
  const { canWrite, writeHint } = usePermissions();
  const { data: supplier, isPending, error, refetch } = useSupplier(id);
  useCrumbLeaf(supplier?.businessName, goBack);
  const [{ from, to }, setFilters, pagination, setPagination] = useUrlPagedParams({ from: '', to: '' }, 10);
  const history = useSupplierHistory(id, pagination, { from: from || undefined, to: to || undefined });
  const [editing, setEditing] = useState(false);

  const columns: GridColDef<PurchaseReceiptSummary>[] = [
    {
      field: 'number',
      headerName: 'Recepción',
      width: 150,
      sortable: false,
      valueGetter: ({ row }) => `N° ${row.number}`,
    },
    {
      field: 'receivedAt',
      headerName: 'Recibida',
      width: 200,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.receivedAt),
    },
    {
      field: 'doc',
      headerName: 'Documento',
      flex: 1,
      minWidth: 170,
      sortable: false,
      valueGetter: ({ row }) =>
        `${labelOf(SUPPLIER_DOCUMENT_TYPE, row.supplierDocumentType).text} ${row.supplierDocumentNumber}`,
    },
    {
      field: 'totalAmount',
      headerName: 'Importe',
      width: 130,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row.totalAmount),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 260,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="flex gap-1.5">
          <Badge label={labelOf(RECEIPT_STATUS, row.status)} />
          <Badge label={labelOf(RECEIPT_PAYMENT, row.paymentStatus)} />
        </span>
      ),
    },
  ];

  useClampPage(pagination, history.data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title={supplier?.businessName ?? 'Ficha del proveedor'}
        badges={
          supplier && (
            <>
              <Badge label={labelOf(SUPPLIER_KIND, supplier.kind)} />
              <Badge
                label={supplier.isActive ? { text: 'Activo', tone: 'success' } : { text: 'De baja', tone: 'neutral' }}
              />
            </>
          )
        }
        actions={
          supplier && (
            <Button size="sm" icon={<Pencil />} disabled={!canWrite} title={writeHint} onClick={() => setEditing(true)}>
              Editar
            </Button>
          )
        }
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !supplier ? (
        <ErrorState error={error} resource="El proveedor" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <DetailList
              items={[
                { label: 'CUIT', value: formatCuit(supplier.cuit), mono: true },
                { label: 'Contacto', value: supplier.contactName },
                { label: 'Teléfono', value: supplier.phone },
                { label: 'Email', value: supplier.email },
                { label: 'Dirección', value: supplier.address, wide: true },
                {
                  label: 'Plazo de pago',
                  value:
                    supplier.paymentTermsDays === null
                      ? null
                      : supplier.paymentTermsDays === 0
                        ? 'Contado'
                        : `${supplier.paymentTermsDays} días`,
                },
              ]}
            />
            <LinkedEntityPhoto
              kind="supplier"
              id={supplier.supplierId}
              subject="del proveedor"
              canEdit={canWrite}
              className="mt-5 border-t border-outline pt-5"
            />
          </Card>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                title="Recepciones"
                icon={Receipt}
                value={history.data ? formatNumber(history.data.receiptsCount) : '—'}
                loading={history.isPending}
              />
              <KpiCard
                title="Llenas recibidas"
                icon={Flame}
                value={history.data ? formatNumber(history.data.fullReceived) : '—'}
                loading={history.isPending}
              />
              <KpiCard
                title="Total comprado"
                icon={Banknote}
                value={history.data ? formatCurrency(history.data.totalAmount) : '—'}
                loading={history.isPending}
              />
            </div>
            <Card>
              <CardHeader
                title="Historial de compras"
                action={<DateRangeFilter from={from} to={to} onChange={(range) => setFilters(range)} />}
                className="border-b border-outline px-4 py-3"
              />
              {history.error ? (
                <ErrorState error={history.error} resource="El historial" onRetry={() => void history.refetch()} />
              ) : (
                <ResponsiveTable
                  label="el historial"
                  rows={history.data?.data ?? []}
                  columns={columns}
                  getRowId={(row) => row.receiptId}
                  loading={history.isFetching}
                  pagination={{ model: pagination, onChange: setPagination, total: history.data?.total ?? 0 }}
                  onRowClick={(row) => navigate(`/purchases/receipts/${row.receiptId}`)}
                  empty={
                    from || to ? (
                      <EmptyState
                        icon={Receipt}
                        title="Sin compras en ese período"
                        description="Probá con otras fechas."
                      />
                    ) : (
                      <EmptyState icon={Receipt} title="Todavía no se le compró nada" />
                    )
                  }
                  renderCard={(row) => (
                    <>
                      <button
                        type="button"
                        className="text-left font-semibold text-primary underline"
                        onClick={() => navigate(`/purchases/receipts/${row.receiptId}`)}
                      >
                        Recepción N° {row.number}
                      </button>
                      <p className="text-sm text-muted">
                        {formatDateTime(row.receivedAt)} · {formatCurrency(row.totalAmount)}
                      </p>
                      <div className="flex gap-1.5">
                        <Badge label={labelOf(RECEIPT_STATUS, row.status)} />
                        <Badge label={labelOf(RECEIPT_PAYMENT, row.paymentStatus)} />
                      </div>
                    </>
                  )}
                />
              )}
            </Card>
          </div>
        </div>
      )}
      {supplier && <SupplierFormModal open={editing} onClose={() => setEditing(false)} supplier={supplier} />}
    </PageContainer>
  );
};
