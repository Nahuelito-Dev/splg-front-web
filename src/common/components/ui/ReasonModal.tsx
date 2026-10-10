import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { TextArea } from './Field';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  /** Qué pasa al confirmar. En las bajas aclara que es lógica: el registro no se borra. */
  description: string;
  reasonLabel?: string;
  placeholder?: string;
  confirmLabel: string;
  /** El motivo es obligatorio (lo exige la API) o se puede dejar vacío. */
  required?: boolean;
  danger?: boolean;
  loading: boolean;
  /** Algo más para decidir antes del motivo (qué se afecta, avisos). */
  children?: ReactNode;
}

/**
 * Confirmación de una acción que pide un motivo (baja lógica, descarte, ocultar). El motivo viaja a la API y queda
 * registrado: por eso no es un `confirm` suelto.
 */
export const ReasonModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  reasonLabel = 'Motivo',
  placeholder,
  confirmLabel,
  required = true,
  danger = true,
  loading,
  children,
}: Props) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const error = required && touched && !trimmed ? 'Escribí el motivo' : undefined;

  const submit = () => {
    setTouched(true);
    if (required && !trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {children}
        <TextArea
          label={required ? reasonLabel : `${reasonLabel} (opcional)`}
          required={required}
          placeholder={placeholder}
          value={reason}
          error={error}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
};
