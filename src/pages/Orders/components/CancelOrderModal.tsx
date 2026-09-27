import { useEffect, useState } from 'react';
import { Button, Modal, TextArea } from '../../../common/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  cancelling: boolean;
}

/** El motivo es opcional para la API, pero ayuda a que quede registrado por qué se canceló. */
export const CancelOrderModal = ({ open, onClose, onConfirm, cancelling }: Props) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar pedido"
      description="El cliente y, si ya tenía chofer asignado, el chofer se enteran de la cancelación."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim())} loading={cancelling}>
            Cancelar pedido
          </Button>
        </>
      }
    >
      <TextArea
        label="Motivo (opcional)"
        placeholder="Por ejemplo: el cliente no estaba en el domicilio"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
};
