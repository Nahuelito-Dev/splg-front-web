import { useState, type MouseEvent } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Ellipsis, Eye, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { IconButton } from './IconButton';
import { cx } from './cx';

interface RowAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
}

interface Props {
  /** Nombre de la fila para los lectores de pantalla ("pedido #1C647A"). */
  rowLabel: string;
  onView?: () => void;
  onEdit?: () => void;
  /** Baja lógica: el que llama pide la confirmación antes de dar de baja. */
  onDelete?: () => void;
  /** Texto de la baja según la pantalla ("Eliminar", "Dar de baja", "Desactivar"). */
  deleteLabel?: string;
  /** Lo demás va en el menú ⋯ al final de la fila. Sin acciones, no hay menú. */
  actions?: RowAction[];
}

/**
 * Acciones de una fila: Ver, Editar y Eliminar como botones con ícono, en ese
 * orden, y lo que no aplica a la entidad no se muestra. Las acciones extra van
 * en un menú ⋯. Los clics no llegan a la fila (que también abre el detalle).
 */
export const RowActions = ({ rowLabel, onView, onEdit, onDelete, deleteLabel = 'Eliminar', actions = [] }: Props) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <div className="flex items-center justify-end gap-1.5" onClick={stop}>
      {onView && <IconButton label={`Ver ${rowLabel}`} icon={<Eye />} onClick={onView} />}
      {onEdit && <IconButton label={`Editar ${rowLabel}`} icon={<Pencil />} onClick={onEdit} />}
      {onDelete && (
        <IconButton label={`${deleteLabel} ${rowLabel}`} icon={<Trash2 />} tone="danger" onClick={onDelete} />
      )}
      {actions.length > 0 && (
        <>
          <IconButton
            label={`Más acciones de ${rowLabel}`}
            icon={<Ellipsis />}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            onClick={(event) => setAnchor(event.currentTarget)}
          />
          <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { className: '!mt-1 !min-w-[180px] !rounded-xl !border !border-outline !shadow-lg' } }}
          >
            {actions.map(({ label, icon: Icon, onClick, tone = 'neutral' }) => (
              <MenuItem
                key={label}
                onClick={() => {
                  setAnchor(null);
                  onClick();
                }}
                className={cx('!gap-2.5 !py-2 !text-[13px]', tone === 'danger' ? '!text-danger' : '!text-ink')}
              >
                <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                {label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </div>
  );
};
