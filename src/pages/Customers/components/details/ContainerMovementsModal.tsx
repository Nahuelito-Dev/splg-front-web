import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Button, EmptyState, ErrorState, ListSkeleton, Modal, cx } from '../../../../common/components/ui';
import { useCustomerContainerMovements } from '../../../../services/queries/customerContainers';
import { formatDateTime, formatShortId } from '../../../../utils/format';
import { containerReasonText, signedQuantity } from './containerRules';

/** Movimientos por página del historial. */
export const MOVEMENTS_PAGE_SIZE = 10;

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
}

/** El historial de la cuenta de envases del cliente: saldo inicial, compras, ajustes y devoluciones, más nuevos primero. */
export const ContainerMovementsModal = ({ open, onClose, customerId }: Props) => {
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const { data, isPending, isPlaceholderData, error, refetch } = useCustomerContainerMovements(
    customerId,
    { page, pageSize: MOVEMENTS_PAGE_SIZE },
    { enabled: open },
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  // El rango sale de la página que se ve: mientras llega la nueva siguen a la vista los movimientos de la anterior.
  const from = data?.offset ?? 0;
  const hasNext = from + items.length < total;
  const switching = isPlaceholderData === true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Historial de envases"
      description="Cada cambio en los envases propios del cliente, con su motivo."
    >
      {isPending ? (
        <ListSkeleton rows={3} columns={3} />
      ) : error ? (
        <ErrorState error={error} resource="El cliente" onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="Sin movimientos" description="Los envases de este cliente no cambiaron." />
      ) : (
        <>
          <ul className="divide-y divide-outline-soft" aria-label="Movimientos de envases">
            {items.map((m) => (
              <li key={m.movementId} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {m.type} · {containerReasonText(m.reason)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(m.createdAt)}
                    {m.orderId && (
                      <>
                        {' · '}
                        <Link className="font-mono text-primary underline" to={`/orders/${m.orderId}`}>
                          Pedido {formatShortId(m.orderId)}
                        </Link>
                      </>
                    )}
                  </p>
                  {m.note && <p className="mt-1 break-words text-sm text-ink-2">{m.note}</p>}
                </div>
                <span
                  className={cx(
                    'shrink-0 font-mono text-sm font-semibold',
                    m.quantity < 0 ? 'text-danger' : 'text-success',
                  )}
                >
                  {signedQuantity(m.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline pt-3">
            <span className="text-xs text-muted" aria-live="polite">
              {from + 1}–{from + items.length} de {total}
              {switching && ' · Cargando…'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={switching || from === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anteriores
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={switching || !hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguientes
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};
