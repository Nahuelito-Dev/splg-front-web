import { useId, type ReactNode } from 'react';
import { Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from './IconButton';

interface Props {
  open: boolean;
  onClose: () => void;
  closeBlocked?: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  /** Botones del pie (Cancelar / Guardar). */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Modal accesible: foco atrapado, Escape cierra y el título es el nombre del
 * diálogo (lo resuelve el Dialog de MUI). El contenido va con Tailwind.
 */
export const Modal = ({
  open,
  onClose,
  closeBlocked = false,
  title,
  description,
  children,
  footer,
  size = 'sm',
}: Props) => {
  const titleId = useId();
  const close = () => {
    if (!closeBlocked) onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth={size} aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-4 border-b border-outline px-6 py-4">
        <div>
          <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <IconButton label="Cerrar" icon={<CloseIcon />} onClick={close} disabled={closeBlocked} />
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-outline bg-surface-hover px-6 py-4">
          {footer}
        </div>
      )}
    </Dialog>
  );
};
