import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  validateReason?: (reason: string) => string | undefined;
  reasonHint?: (reason: string) => string | undefined;
  serverError?: string | null;
  onReasonChange?: () => void;
  danger?: boolean;
  loading: boolean;
  closeBlocked?: boolean;
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
  validateReason,
  reasonHint,
  serverError,
  onReasonChange,
  danger = true,
  loading,
  closeBlocked = loading,
  children,
}: Props) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const trimmed = reason.trim();
  const validation = (required && !trimmed ? 'Escribí el motivo' : undefined) ?? validateReason?.(reason);
  const error = touched ? validation : undefined;
  const hint = reasonHint?.(reason);

  const submit = () => {
    setTouched(true);
    if (validation) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={closeBlocked}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={closeBlocked}>
            Volver
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={submit}
            onMouseDown={() => setTouched(true)}
            onKeyDown={() => setTouched(true)}
            loading={loading}
            blockedReason={validation ? validation : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {children}
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <TextArea
          ref={inputRef}
          label={required ? reasonLabel : `${reasonLabel} (opcional)`}
          required={required}
          placeholder={placeholder}
          value={reason}
          error={error}
          hint={hint}
          onBlur={() => setTouched(true)}
          onChange={(e) => {
            setReason(e.target.value);
            onReasonChange?.();
          }}
        />
      </div>
    </Modal>
  );
};
