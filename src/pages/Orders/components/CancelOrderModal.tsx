import { AffectedList, ReasonModal } from '../../../common/components/ui';
import { cancelReasonCounter, cancelReasonError } from './cancelReason';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  cancelling: boolean;
  /** Cancelación en lote: cuántos pedidos se cancelan de una vez. */
  count?: number;
  /** Qué pedidos se van a afectar (lote): se listan antes de confirmar. */
  affected?: string[];
}

/** El back exige el motivo para cancelar (queda en el historial y el cliente lo ve), por eso acá es obligatorio. */
export const CancelOrderModal = ({ open, onClose, onConfirm, cancelling, count = 1, affected }: Props) => (
  <ReasonModal
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    title={count > 1 ? `Cancelar ${count} pedidos` : 'Cancelar pedido'}
    description={
      count > 1
        ? 'Cada cliente y, si ya tenía chofer asignado, su chofer se enteran de la cancelación. Se usa el mismo motivo para todos.'
        : 'El cliente y, si ya tenía chofer asignado, el chofer se enteran de la cancelación. Si el pedido estaba pagado en línea, el pago se devuelve solo por la pasarela.'
    }
    placeholder="Por ejemplo: el cliente no estaba en el domicilio"
    confirmLabel={count > 1 ? `Cancelar ${count} pedidos` : 'Cancelar pedido'}
    validateReason={cancelReasonError}
    reasonHint={cancelReasonCounter}
    loading={cancelling}
  >
    {affected && <AffectedList items={affected} />}
  </ReasonModal>
);
