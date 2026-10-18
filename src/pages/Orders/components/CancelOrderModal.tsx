import { useEffect, useState } from 'react';
import { AffectedList, Button, Modal, TextArea } from '../../../common/components/ui';

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

/** El motivo es opcional para la API, pero ayuda a que quede registrado por qué se canceló. */
export const CancelOrderModal = ({ open, onClose, onConfirm, cancelling, count = 1, affected }: Props) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={count > 1 ? `Cancelar ${count} pedidos` : 'Cancelar pedido'}
      description={
        count > 1
          ? 'Cada cliente y, si ya tenía chofer asignado, su chofer se enteran de la cancelación. Se usa el mismo motivo para todos.'
          : 'El cliente y, si ya tenía chofer asignado, el chofer se enteran de la cancelación. Si el pedido estaba pagado en línea, el pago se devuelve solo por la pasarela.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim())} loading={cancelling}>
            {count > 1 ? `Cancelar ${count} pedidos` : 'Cancelar pedido'}
          </Button>
        </>
      }
    >
      {affected && (
        <div className="mb-3">
          <AffectedList items={affected} />
        </div>
      )}
      <TextArea
        label="Motivo (opcional)"
        placeholder="Por ejemplo: el cliente no estaba en el domicilio"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
};
