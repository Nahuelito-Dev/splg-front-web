import { useSyncExternalStore } from 'react';
import { Dialog } from '@mui/material';
import { currentConfirm, settleConfirm, subscribeConfirms, type PendingConfirm } from '../../../utils/notifications';
import { Button } from './Button';

/** El contenido de una solicitud. Se monta de nuevo por cada una (`key`), así el foco arranca donde corresponde. */
const ConfirmContent = ({ pending }: { pending: PendingConfirm }) => {
  const titleId = `confirm-title-${pending.id}`;
  const textId = `confirm-text-${pending.id}`;
  const danger = pending.danger ?? false;
  return (
    <div>
      <div className="px-6 pb-2 pt-5">
        <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-ink">
          {pending.title}
        </h2>
        {pending.text && (
          <p id={textId} className="mt-1.5 text-sm text-muted">
            {pending.text}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 px-6 pb-5 pt-3">
        <Button variant="secondary" autoFocus={danger} onClick={() => settleConfirm(false)}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} autoFocus={!danger} onClick={() => settleConfirm(true)}>
          {pending.confirmText ?? 'Confirmar'}
        </Button>
      </div>
    </div>
  );
};

/**
 * Dibuja las confirmaciones que pide `confirm()` (utils/notifications). Se monta una sola vez en la App.
 * Es un Dialog de MUI: queda por encima de otros diálogos porque se abre después y el foco lo maneja MUI.
 */
export const ConfirmDialogHost = () => {
  const pending = useSyncExternalStore(subscribeConfirms, currentConfirm);
  return (
    <Dialog
      open={Boolean(pending)}
      onClose={() => settleConfirm(false)}
      maxWidth="xs"
      fullWidth
      aria-labelledby={pending ? `confirm-title-${pending.id}` : undefined}
      aria-describedby={pending?.text ? `confirm-text-${pending.id}` : undefined}
    >
      {pending && <ConfirmContent key={pending.id} pending={pending} />}
    </Dialog>
  );
};
