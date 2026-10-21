import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Ban, Banknote } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import { AttachmentsPanel } from '../../common/components/AttachmentsPanel';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
  ResponsiveTable,
  PageContainer,
  CardHeader,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { PurchaseReceiptItem } from '../../services/api/types';
import { usePurchaseReceipt, useUpdateReceiptPaymentStatus } from '../../services/queries/purchases';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { RECEIPT_PAYMENT, RECEIPT_STATUS, SUPPLIER_DOCUMENT_TYPE, labelOf } from '../../utils/statusLabels';
import { PayReceiptModal } from './components/PayReceiptModal';
import { VoidReceiptModal } from './components/VoidReceiptModal';

const COLUMNS: GridColDef<PurchaseReceiptItem>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', flex: 1, minWidth: 120, sortable: false },
  { field: 'quantityFull', headerName: 'Llenas recibidas', width: 150, type: 'number', sortable: false },
  { field: 'quantityEmptyOut', headerName: 'Vacías a la planta', width: 160, type: 'number', sortable: false },
  {
    field: 'unitCost',
    headerName: 'Costo unit.',
    width: 120,
    sortable: false,
    valueGetter: ({ row }) => formatCurrency(row.unitCost),
  },
  {
    field: 'subtotal',
    headerName: 'Subtotal',
    width: 130,
    sortable: false,
    valueGetter: ({ row }) => formatCurrency(row.subtotal),
  },
];

/** La ficha de una recepción: renglones, pago, anulación y el documento del proveedor escaneado. */
export const PurchaseReceiptDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/purchases/receipts');
  const { canWrite, writeHint } = usePermissions();
  const { data: receipt, isPending, error, refetch } = usePurchaseReceipt(id);
  useCrumbLeaf(receipt ? `Recepción N° ${receipt.number}` : null, goBack);
  const setPayment = useUpdateReceiptPaymentStatus();
  const [voiding, setVoiding] = useState(false);
  const [paying, setPaying] = useState(false);

  const togglePayment = async () => {
    if (!receipt) return;
    if (receipt.paymentStatus !== 'paid') {
      setPaying(true);
      return;
    }
    const ok = await confirm({
      title: '¿Marcar como sin pagar?',
      text: receipt.cashMovementId
        ? 'Vuelve a figurar pendiente de pago y el efectivo vuelve a la caja de la que salió.'
        : 'Vuelve a figurar pendiente de pago.',
    });
    if (!ok) return;
    setPayment.mutate(
      { id: receipt.receiptId, body: { paymentStatus: 'unpaid' } },
      { onSuccess: () => notify.success('Marcada sin pagar'), onError: notify.error },
    );
  };

  const confirmed = receipt?.status === 'confirmed';

  return (
    <PageContainer>
      <PageHeader
        title={receipt ? `Recepción N° ${receipt.number}` : 'Recepción'}
        badges={
          receipt && (
            <>
              <Badge label={labelOf(RECEIPT_STATUS, receipt.status)} />
              <Badge label={labelOf(RECEIPT_PAYMENT, receipt.paymentStatus)} />
            </>
          )
        }
        actions={
          receipt &&
          confirmed &&
          canWrite && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<Banknote />}
                loading={setPayment.isPending}
                onClick={() => void togglePayment()}
              >
                {receipt.paymentStatus === 'paid' ? 'Marcar sin pagar' : 'Marcar pagada'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Ban />}
                blockedReason={
                  receipt.paymentStatus === 'paid'
                    ? 'Una recepción pagada no se anula: marcala sin pagar primero'
                    : undefined
                }
                onClick={() => setVoiding(true)}
              >
                Anular
              </Button>
            </>
          )
        }
      />
      {!canWrite && writeHint && (
        <p className="-mt-3 mb-4 text-sm text-muted">{writeHint} para operar esta recepción.</p>
      )}
      {isPending ? (
        <DetailSkeleton />
      ) : error || !receipt ? (
        <ErrorState error={error} resource="La recepción" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <DetailList
              items={[
                {
                  label: 'Proveedor',
                  value: (
                    <Link className="text-primary underline" to={`/purchases/suppliers/${receipt.supplierId}`}>
                      {receipt.supplierName}
                    </Link>
                  ),
                },
                {
                  label: 'Orden de compra',
                  value: receipt.purchaseOrderId ? (
                    <Link className="text-primary underline" to={`/purchases/orders/${receipt.purchaseOrderId}`}>
                      N° {receipt.purchaseOrderNumber}
                    </Link>
                  ) : (
                    'Compra directa'
                  ),
                },
                {
                  label: 'Documento del proveedor',
                  value: `${labelOf(SUPPLIER_DOCUMENT_TYPE, receipt.supplierDocumentType).text} ${receipt.supplierDocumentNumber}`,
                },
                { label: 'Recibida en', value: receipt.warehouseName },
                { label: 'Cuándo llegó', value: formatDateTime(receipt.receivedAt) },
                { label: 'Total', value: formatCurrency(receipt.totalAmount), mono: true },
                { label: 'Notas', value: receipt.notes, wide: true },
                ...(receipt.voidReason
                  ? [
                      { label: 'Anulada', value: formatDateTime(receipt.voidedAt) },
                      { label: 'Motivo de la anulación', value: receipt.voidReason, wide: true },
                    ]
                  : []),
              ]}
            />
          </Card>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Renglones" className="border-b border-outline px-4 py-3" />
              <ResponsiveTable
                label="renglones"
                rows={receipt.items}
                columns={COLUMNS}
                getRowId={(row) => row.itemId}
                renderCard={(row) => (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                    <p className="text-muted">
                      {row.quantityFull} llenas · {row.quantityEmptyOut} vacías a la planta
                    </p>
                    <p className="text-muted">
                      {formatCurrency(row.unitCost)} c/u · subtotal {formatCurrency(row.subtotal)}
                    </p>
                  </div>
                )}
              />
            </Card>
            <Card className="p-6">
              <AttachmentsPanel
                ownerType="purchase_receipt"
                ownerId={receipt.receiptId}
                canWrite={canWrite}
                blockedReason={writeHint}
                title="Foto del remito"
                hint="remito, factura, comprobante…"
              />
            </Card>
          </div>
        </div>
      )}
      <PayReceiptModal receipt={paying ? (receipt ?? null) : null} onClose={() => setPaying(false)} />
      <VoidReceiptModal receipt={voiding ? (receipt ?? null) : null} onClose={() => setVoiding(false)} />
    </PageContainer>
  );
};
