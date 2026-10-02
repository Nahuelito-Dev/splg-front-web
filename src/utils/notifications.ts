import { enqueueSnackbar } from 'notistack';
import Swal from 'sweetalert2';
import { errorMessage } from '../services/api/errors';

/** Avisos cortos (toasts). Se pueden llamar desde cualquier lado. */
export const notify = {
  success: (message: string) => enqueueSnackbar(message, { variant: 'success' }),
  error: (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
  info: (message: string) => enqueueSnackbar(message, { variant: 'info' }),
};

interface ConfirmOptions {
  title: string;
  text?: string;
  /** Texto del botón que confirma (por defecto "Confirmar"). */
  confirmText?: string;
  /** Acción destructiva: el botón va en rojo y el foco arranca en Cancelar. */
  danger?: boolean;
}

/** Por encima de los diálogos de MUI (z-index 1300) y de sus toasts. */
const CONFIRM_Z_INDEX = '1500';

let openConfirms = 0;
const confirmListeners = new Set<() => void>();
const setOpenConfirms = (next: number) => {
  openConfirms = next;
  confirmListeners.forEach((listener) => listener());
};

/** Para `useSyncExternalStore`: avisa cuando se abre o se cierra una confirmación. */
export const subscribeConfirmOpen = (listener: () => void) => {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
};
export const isConfirmOpen = () => openConfirms > 0;

/**
 * Pide confirmación antes de una acción. Devuelve true si el usuario confirmó.
 * Los estilos salen de la paleta (clases de Tailwind), no de colores sueltos.
 */
export async function confirm({
  title,
  text,
  confirmText = 'Confirmar',
  danger = false,
}: ConfirmOptions): Promise<boolean> {
  setOpenConfirms(openConfirms + 1);
  try {
    // Un tick para que los diálogos de MUI abiertos suelten el foco antes de que SweetAlert lo tome.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const { isConfirmed } = await Swal.fire({
      // Si hay un diálogo de MUI abierto, la confirmación tiene que verse encima de él.
      didOpen: (popup) => {
        if (popup.parentElement) popup.parentElement.style.zIndex = CONFIRM_Z_INDEX;
      },
      title,
      text,
      icon: danger ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: danger,
      buttonsStyling: false,
      customClass: {
        popup: '!bg-surface rounded-2xl font-sans',
        title: 'font-display text-ink',
        htmlContainer: 'text-muted',
        actions: 'gap-3',
        confirmButton: `rounded-lg px-4 py-2 text-sm font-semibold ${
          danger ? 'bg-danger text-white hover:bg-danger/90' : 'bg-primary text-on-primary hover:bg-primary-hover'
        }`,
        cancelButton:
          'rounded-lg border border-outline bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-hover',
      },
    });
    return isConfirmed;
  } finally {
    setOpenConfirms(openConfirms - 1);
  }
}
