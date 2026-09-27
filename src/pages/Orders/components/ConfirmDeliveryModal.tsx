import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../../common/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  confirming: boolean;
  /** El código ya visto en esta sesión con "Ver código", para no tener que retipearlo. */
  defaultCode?: string;
}

/** El cliente confirma la entrega escaneando el QR del chofer; acá el admin la confirma en su nombre (soporte telefónico). */
export const ConfirmDeliveryModal = ({ open, onClose, onConfirm, confirming, defaultCode = '' }: Props) => {
  const [code, setCode] = useState(defaultCode);

  useEffect(() => {
    if (open) setCode(defaultCode);
  }, [open, defaultCode]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar entrega"
      description="El mismo código que el chofer muestra en su QR. Sólo confirmá si el cliente ya recibió el pedido."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={() => onConfirm(code.trim())} loading={confirming} disabled={!code.trim()}>
            Confirmar entrega
          </Button>
        </>
      }
    >
      <Input
        label="Código de entrega"
        placeholder="Ej: A1B2C3D4E5"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="font-mono"
      />
    </Modal>
  );
};
