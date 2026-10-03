import { createPortal } from 'react-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, LoadingState } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useCurrentDistributor } from '../../services/queries/distributors';
import { useOrder } from '../../services/queries/orders';
import { OrderRemito } from './components/details/OrderRemito';
import './remito.css';

/**
 * El remito imprimible de un pedido (`/orders/:id/remito`). Se monta sobre
 * todo el panel (portal en `body`) y al imprimir queda sólo la hoja A4, así se
 * puede guardar como PDF desde el diálogo de impresión del navegador.
 */
export const OrderInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { needsDistributor } = usePermissions();
  const { data: order, isPending, error, refetch } = useOrder(id);
  const {
    data: distributor,
    isPending: loadingDistributor,
    error: distributorError,
    refetch: refetchDistributor,
  } = useCurrentDistributor(!needsDistributor);
  // Sin «Ver como» el administrador general no tiene una empresa y el pedido no trae la suya: sale sin membrete, avisado.
  const waitingLetterhead = !needsDistributor && loadingDistributor;
  const canPrint = Boolean(order) && !waitingLetterhead && !distributorError;

  return createPortal(
    <div className="remito-portal fixed inset-0 z-[60] overflow-y-auto bg-bg">
      <div className="mx-auto max-w-[210mm] p-4 sm:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft />}
            onClick={() => navigate(id ? `/orders/${id}` : '/orders')}
          >
            Volver al pedido
          </Button>
          <Button size="sm" icon={<Printer />} disabled={!canPrint} onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
        {needsDistributor && (
          <p role="status" className="mb-4 rounded-lg bg-warn-soft p-3 text-sm text-warn print:hidden">
            Elegí una distribuidora con «Ver como» para que el remito lleve su membrete; así se imprime sin él.
          </p>
        )}
        {distributorError && (
          <div className="mb-4 print:hidden">
            <ErrorState
              error={distributorError}
              resource="Los datos de la distribuidora"
              onRetry={() => void refetchDistributor()}
            />
          </div>
        )}
        {isPending ? (
          <LoadingState />
        ) : error || !order ? (
          <ErrorState error={error} resource="El pedido" onRetry={() => void refetch()} />
        ) : (
          <OrderRemito order={order} distributor={distributor} />
        )}
      </div>
    </div>,
    document.body,
  );
};
