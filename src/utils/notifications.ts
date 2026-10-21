import { enqueueSnackbar } from 'notistack';
import { errorMessage } from '../services/api/errors';

/** Avisos cortos (toasts). Se pueden llamar desde cualquier lado. */
export const notify = {
  success: (message: string) => enqueueSnackbar(message, { variant: 'success' }),
  error: (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
  info: (message: string) => enqueueSnackbar(message, { variant: 'info' }),
};

export interface ConfirmOptions {
  title: string;
  text?: string;
  /** Texto del botón que confirma (por defecto "Confirmar"). */
  confirmText?: string;
  /** Acción destructiva: el botón va en rojo y el foco arranca en Cancelar. */
  danger?: boolean;
  /** Identifica la solicitud para poder cerrarla desde afuera (`dismissConfirm`). */
  key?: string;
}

export interface PendingConfirm extends ConfirmOptions {
  /** Distingue una solicitud de la siguiente: el diálogo se monta de nuevo por cada una. */
  id: number;
  resolve: (confirmed: boolean) => void;
}

/** Cola de confirmaciones: las dibuja `ConfirmDialogHost` (montado una vez en la App). */
let queue: PendingConfirm[] = [];
let nextConfirmId = 0;
const listeners = new Set<() => void>();
const setQueue = (next: PendingConfirm[]) => {
  queue = next;
  listeners.forEach((listener) => listener());
};

/** Para `useSyncExternalStore`. */
export const subscribeConfirms = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
/** La confirmación que se muestra ahora (la más vieja de la cola). */
export const currentConfirm = () => queue[0];
export const settleConfirm = (confirmed: boolean) => {
  const [first, ...rest] = queue;
  if (!first) return;
  setQueue(rest);
  first.resolve(confirmed);
};

/** Cierra (como «cancelar») las solicitudes pendientes con esa `key`: por ejemplo cuando se desmonta quien las pidió. */
export const dismissConfirm = (key: string) => {
  const dismissed = queue.filter((pending) => pending.key === key);
  if (dismissed.length === 0) return;
  setQueue(queue.filter((pending) => pending.key !== key));
  dismissed.forEach((pending) => pending.resolve(false));
};

/** Pide confirmación antes de una acción. Devuelve true si el usuario confirmó. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setQueue([...queue, { ...options, id: ++nextConfirmId, resolve }]);
  });
}
