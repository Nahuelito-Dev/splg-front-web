import { useState } from 'react';
import { Button, Input, Modal } from '../../../common/components/ui';

interface Props {
  open: boolean;
  title: string;
  busy?: boolean;
  onClose: () => void;
  /** El turno elegido, como instante ISO. */
  onConfirm: (scheduledAt: string) => void;
}

/** Pide la fecha y la hora del turno al pasar una tarea de «Pronosticadas» a «Programadas». */
export const ScheduleDialog = ({ open, title, busy, onClose, onConfirm }: Props) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      setError('Elegí la fecha y la hora del turno');
      return;
    }
    setError(undefined);
    onConfirm(date.toISOString());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={busy}
      size="sm"
      title="Programar turno"
      description={`¿Cuándo es el turno de «${title}»?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            Programar
          </Button>
        </>
      }
    >
      <Input
        label="Fecha y hora del turno"
        type="datetime-local"
        value={value}
        error={error}
        onChange={(event) => setValue(event.target.value)}
      />
    </Modal>
  );
};
