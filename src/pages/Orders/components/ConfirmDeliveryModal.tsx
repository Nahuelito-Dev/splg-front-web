import { useEffect, useRef, useState } from 'react';
import { Button, Modal, TextArea } from '../../../common/components/ui';
import { deliveryReasonCounter, deliveryReasonError } from './deliveryReason';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  confirming: boolean;
  error?: string | null;
  onEdit?: () => void;
}

/** El chofer confirma la entrega tipeando el código que le dice el cliente; acá el admin la confirma sin el chofer, con motivo. */
export const ConfirmDeliveryModal = ({ open, onClose, onConfirm, confirming, error, onEdit }: Props) => {
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setReasonTouched(false);
      window.setTimeout(() => reasonRef.current?.focus(), 0);
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const reasonValidation = deliveryReasonError(reason);
  const validation = reasonValidation;
  const reasonError = reasonTouched ? reasonValidation : undefined;

  const submit = () => {
    setReasonTouched(true);
    if (validation) return;
    onConfirm(trimmedReason);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={confirming}
      title="Confirmar entrega"
      description="Lo habitual es que el chofer cierre la entrega con el código que le dice el cliente. Confirmala desde acá sólo si el cliente ya recibió el pedido; queda registrada como confirmada por la distribuidora."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            Volver
          </Button>
          <Button
            onClick={submit}
            onMouseDown={() => {
              setReasonTouched(true);
            }}
            onKeyDown={() => {
              setReasonTouched(true);
            }}
            loading={confirming}
            blockedReason={validation}
          >
            Confirmar entrega
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <TextArea
          ref={reasonRef}
          label="Motivo"
          required
          placeholder="Ej: El cliente confirmó la recepción por teléfono."
          value={reason}
          error={reasonError}
          hint={deliveryReasonCounter(reason)}
          onBlur={() => setReasonTouched(true)}
          onChange={(e) => {
            setReason(e.target.value);
            onEdit?.();
          }}
        />
      </div>
    </Modal>
  );
};
