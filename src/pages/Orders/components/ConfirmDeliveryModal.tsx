import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import { deliveryReasonCounter, deliveryReasonError } from './deliveryReason';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string, reason: string) => void;
  confirming: boolean;
  error?: string | null;
  onEdit?: () => void;
  /** El código ya visto en esta sesión con "Ver código", para no tener que retipearlo. */
  defaultCode?: string;
}

/** El cliente confirma la entrega escaneando el QR del chofer; acá el admin la confirma en su nombre (soporte telefónico). */
export const ConfirmDeliveryModal = ({
  open,
  onClose,
  onConfirm,
  confirming,
  error,
  onEdit,
  defaultCode = '',
}: Props) => {
  const [code, setCode] = useState(defaultCode);
  const [reason, setReason] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode(defaultCode);
      setReason('');
      setCodeTouched(false);
      setReasonTouched(false);
      window.setTimeout(() => codeRef.current?.focus(), 0);
    }
  }, [open, defaultCode]);

  const trimmedCode = code.trim();
  const trimmedReason = reason.trim();
  const reasonValidation = deliveryReasonError(reason);
  const codeValidation = trimmedCode ? undefined : 'Ingresá el código de entrega';
  const validation = codeValidation ?? reasonValidation;
  const reasonError = reasonTouched ? reasonValidation : undefined;
  const codeError = codeTouched ? codeValidation : undefined;

  const submit = () => {
    setCodeTouched(true);
    setReasonTouched(true);
    if (validation) return;
    onConfirm(trimmedCode, trimmedReason);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={confirming}
      title="Confirmar entrega"
      description="El mismo código que el chofer muestra en su QR. Sólo confirmá si el cliente ya recibió el pedido."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            Volver
          </Button>
          <Button
            onClick={submit}
            onMouseDown={() => {
              setCodeTouched(true);
              setReasonTouched(true);
            }}
            onKeyDown={() => {
              setCodeTouched(true);
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
        <Input
          ref={codeRef}
          label="Código de entrega"
          placeholder="Ej: A1B2C3D4E5"
          value={code}
          error={codeError}
          onBlur={() => setCodeTouched(true)}
          onChange={(e) => {
            setCode(e.target.value);
            onEdit?.();
          }}
          className="font-mono"
        />
        <TextArea
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
