import { ExternalLink, FileText, Landmark } from 'lucide-react';
import { Card, CardHeader, Skeleton } from '../../../../common/components/ui';
import { errorMessage } from '../../../../services/api/errors';
import type { OrderReceiptFile } from '../../../../services/api/types';
import { useOrderTransferReceipts } from '../../../../services/queries/orders';
import { formatDateTime } from '../../../../utils/format';

const isImage = (file: OrderReceiptFile) => file.mimeType.startsWith('image/');
const kindLabel = (file: OrderReceiptFile) => (file.mimeType === 'application/pdf' ? 'PDF' : 'Imagen');

/**
 * Los comprobantes que subió el cliente para el pedido que paga por transferencia, para mirarlos antes de confirmar o
 * rechazar el pago. Las URL son firmadas y vencen: la consulta las renueva sola antes de que caduquen.
 */
/** La etiqueta con la que el back guarda el comprobante que sube el cliente. */
const RECEIPT_LABEL = 'Comprobante de transferencia';

export const OrderTransferReceipts = ({ orderId }: { orderId: string }) => {
  const { data, isPending, isError, error, refetch } = useOrderTransferReceipts(orderId);
  // Al admin el back le devuelve todos los adjuntos del pedido: acá van sólo los que subió el cliente como comprobante.
  const receipts = (data ?? []).filter((file) => file.label === RECEIPT_LABEL);

  return (
    <Card className="p-4">
      <CardHeader title="Comprobantes de transferencia" icon={<Landmark />} as="h3" className="mb-3" />
      {isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los comprobantes: {errorMessage(error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </p>
      ) : isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : receipts.length === 0 ? (
        <p className="text-sm text-muted">El cliente todavía no subió el comprobante</p>
      ) : (
        <ul className="space-y-3">
          {receipts.map((file) => (
            <li
              key={file.attachmentId}
              className="flex items-center gap-3 border-b border-outline pb-3 last:border-0 last:pb-0"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir ${file.originalName}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline bg-surface-sunken text-muted"
              >
                {isImage(file) ? (
                  <img src={file.url} alt={`Comprobante ${file.originalName}`} className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-6 w-6" aria-hidden="true" />
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.originalName}</p>
                <p className="text-xs text-muted">
                  {kindLabel(file)} · {formatDateTime(file.uploadedAt)}
                </p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary-strong underline"
              >
                Abrir
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
