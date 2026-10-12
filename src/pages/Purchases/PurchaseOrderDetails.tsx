import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Ban, PackageCheck, Pencil, Send, Slash } from 'lucide-react';
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
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseReceiptSummary } from '../../services/api/types';
import { usePurchaseOrder, useSendPurchaseOrder } from '../../services/queries/purchases';
import { formatCurrency, formatDateTime, formatDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { PURCHASE_ORDER_STATUS, RECEIPT_PAYMENT, RECEIPT_STATUS, labelOf } from '../../utils/statusLabels';
import { CancelOrderModal, CloseShortModal } from './components/OrderReasonModals';
import { PurchaseOrderFormModal } from './components/PurchaseOrderFormModal';
import { PurchaseReceiptFormModal } from './components/PurchaseReceiptFormModal';
import { orderActions } from './purchaseRules';

const ITEM_COLUMNS: GridColDef<PurchaseOrderItem>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', flex: 1, minWidth: 120, sortable: false },
  { field: 'quantity', headerName: 'Pedidas', width: 100, type: 'number', sortable: false },
  { field: 'receivedQuantity', headerName: 'Recibidas', width: 110, type: 'number', sortable: false },
  { field: 'pendingQuantity', headerName: 'Pendientes', width: 120, type: 'number', sortable: false },
  { field: 'emptiesToExchange', headerName: 'Vacías a canjear', width: 150, type: 'number', sortable: false },
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

/** La ficha de una orden de compra: renglones con lo pendiente, recepciones y las acciones según su estado. */
export const PurchaseOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/purchases/orders');
  const { canWrite, writeHint } = usePermissions();
  const { data: order, isPending, error, refetch } = usePurchaseOrder(id);
  useCrumbLeaf(order ? `Orden N° ${order.number}` : null, goBack);
  const send = useSendPurchaseOrder();
  const [editing, setEditing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [closing, setClosing] = useState<PurchaseOrder | null>(null);

  const handleSend = async () => {
    if (!order) return;
    const ok = await confirm({
      title: '¿Enviar la orden?',
      text: `La orden N° ${order.number} pasa a «Enviada» y ya no se puede editar.`,
      confirmText: 'Enviar',
    });
    if (!ok) return;
    send.mutate(order.purchaseOrderId, {
      onSuccess: () => notify.success('Orden enviada'),
      onError: notify.error,
    });
  };

  const can = order ? orderActions(order.status) : null;

  const receiptColumns: GridColDef<PurchaseReceiptSummary>[] = [
    {
      field: 'number',
      headerName: 'Recepción',
      width: 130,
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
    { field: 'supplierDocumentNumber', headerName: 'Documento', flex: 1, minWidth: 130, sortable: false },
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
      width: 250,
      sortable: false,
      renderCell: ({ row }) => (
        <span className="flex gap-1.5">
          <Badge label={labelOf(RECEIPT_STATUS, row.status)} />
          <Badge label={labelOf(RECEIPT_PAYMENT, row.paymentStatus)} />
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title={order ? `Orden de compra N° ${order.number}` : 'Orden de compra'}
        badges={order && <Badge label={labelOf(PURCHASE_ORDER_STATUS, order.status)} />}
        actions={
          order &&
          can &&
          canWrite && (
            <>
              {can.canReceive && (
                <Button size="sm" icon={<PackageCheck />} onClick={() => setReceiving(true)}>
                  Registrar recepción
                </Button>
              )}
              {can.canSend && (
                <Button size="sm" icon={<Send />} loading={send.isPending} onClick={() => void handleSend()}>
                  Enviar
                </Button>
              )}
              {can.canEdit && (
                <Button size="sm" variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>
                  Editar
                </Button>
              )}
              {can.canCloseShort && (
                <Button size="sm" variant="secondary" icon={<Slash />} onClick={() => setClosing(order)}>
                  Cerrar con faltante
                </Button>
              )}
              {can.canCancel && (
                <Button size="sm" variant="danger" icon={<Ban />} onClick={() => setCancelling(order)}>
                  Cancelar
                </Button>
              )}
            </>
          )
        }
      />
      {!canWrite && writeHint && <p className="-mt-3 mb-4 text-sm text-muted">{writeHint} para operar esta orden.</p>}
      {isPending ? (
        <DetailSkeleton />
      ) : error || !order ? (
        <ErrorState error={error} resource="La orden" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <DetailList
              items={[
                { label: 'Proveedor', value: order.supplierName },
                { label: 'Se recibe en', value: order.destinationWarehouseName },
                { label: 'Fecha esperada', value: formatDay(order.expectedDate) },
                { label: 'Total', value: formatCurrency(order.totalAmount), mono: true },
                {
                  label: 'Avance',
                  value: `${order.receivedQuantity} de ${order.orderedQuantity} recibidas · faltan ${order.pendingQuantity}`,
                  wide: true,
                },
                { label: 'Notas', value: order.notes, wide: true },
                ...(order.cancelReason
                  ? [{ label: 'Motivo de la cancelación', value: order.cancelReason, wide: true }]
                  : []),
                ...(order.closeReason ? [{ label: 'Motivo del faltante', value: order.closeReason, wide: true }] : []),
              ]}
            />
          </Card>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">
                Renglones y pendiente
              </h2>
              <ResponsiveTable
                label="renglones"
                rows={order.items}
                columns={ITEM_COLUMNS}
                getRowId={(row) => row.itemId}
                renderCard={(row) => (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                    <p className="text-muted">
                      Pedidas {row.quantity} · recibidas {row.receivedQuantity} · pendientes {row.pendingQuantity}
                    </p>
                    <p className="text-muted">
                      {formatCurrency(row.unitCost)} c/u · vacías a canjear {row.emptiesToExchange}
                    </p>
                  </div>
                )}
              />
            </Card>
            <Card>
              <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">Recepciones</h2>
              <ResponsiveTable
                label="recepciones"
                rows={order.receipts}
                columns={receiptColumns}
                getRowId={(row) => row.receiptId}
                onRowClick={(row) => navigate(`/purchases/receipts/${row.receiptId}`)}
                empty={<EmptyState icon={PackageCheck} title="Todavía no se recibió nada" />}
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
            </Card>
          </div>
        </div>
      )}
      {order && (
        <>
          <PurchaseOrderFormModal open={editing} onClose={() => setEditing(false)} order={order} />
          <PurchaseReceiptFormModal
            open={receiving}
            onClose={() => setReceiving(false)}
            order={order}
            onSaved={(receipt) => navigate(`/purchases/receipts/${receipt.receiptId}`)}
          />
          <CancelOrderModal order={cancelling} onClose={() => setCancelling(null)} />
          <CloseShortModal order={closing} onClose={() => setClosing(null)} />
        </>
      )}
    </div>
  );
};
