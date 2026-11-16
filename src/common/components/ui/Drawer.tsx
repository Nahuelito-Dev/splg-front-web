import { useId, type ReactNode } from 'react';
import { Drawer as MuiDrawer } from '@mui/material';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Acciones fijas al pie del panel. */
  footer?: ReactNode;
  /** Ancho máximo del panel en escritorio; en pantallas chicas ocupa todo. */
  size?: 'md' | 'lg';
}

const WIDTHS = { md: 'min(100%, 480px)', lg: 'min(100%, 640px)' } as const;

/**
 * Detalle en un panel lateral que no tapa toda la pantalla (modelo de los detalles del kanban de Minimal).
 * Accesible: `role="dialog"` con `aria-modal`, foco atrapado y devuelto al cerrar, Escape y clic afuera cierran.
 */
export const Drawer = ({ open, onClose, title, description, children, footer, size = 'md' }: Props) => {
  const titleId = useId();
  return (
    <MuiDrawer
      open={open}
      onClose={onClose}
      anchor="right"
      PaperProps={{
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': titleId,
        sx: { width: WIDTHS[size] },
      }}
    >
      <div className="flex h-full flex-col bg-surface text-ink">
        <div className="flex items-start justify-between gap-3 border-b border-outline px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label="Cerrar" icon={<X />} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline bg-surface-hover px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </MuiDrawer>
  );
};
