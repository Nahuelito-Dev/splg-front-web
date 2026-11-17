import { createContext, useContext, useState, type MouseEvent } from 'react';
import { Divider, Menu, MenuItem } from '@mui/material';
import { Ellipsis, Eye, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { IconButton } from './IconButton';

interface RowAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'neutral' | 'danger';
  /** Si existe pero en esta fila no se puede, el porqué: se ve apagada, con el motivo en su nombre accesible. */
  blockedReason?: string;
}

/**
 * Cómo se acomodan los botones según dónde está la fila:
 * - `inline`: los que hay, pegados a la derecha (tarjetas, listas).
 * - `slots`: en la columna de la tabla; cada botón tiene su lugar fijo (Ver, Editar, ⋯) aunque la fila no lo use,
 *   así el ojo cae siempre en la misma X.
 * - `menu`: todo dentro del ⋯ (tarjetas del celular, donde no hay lugar para tres botones).
 */
export type RowActionsLayout = 'inline' | 'slots' | 'menu';

const RowActionsLayoutContext = createContext<RowActionsLayout>('inline');

/** Lo usan `DataTable` (columna de acciones) y la lista de tarjetas del celular. */
export const RowActionsLayoutProvider = RowActionsLayoutContext.Provider;

interface Props {
  /** Nombre de la fila para los lectores de pantalla ("pedido #1C647A"). */
  rowLabel: string;
  onView?: () => void;
  onEdit?: () => void;
  /**
   * Si «Editar» existe pero esta fila no se puede editar, el porqué: el botón se ve apagado y el motivo va en su
   * nombre accesible y en el tooltip. Sin `onEdit` ni motivo, no se dibuja.
   */
  editBlockedReason?: string;
  /** Baja lógica: el que llama pide la confirmación antes de dar de baja. */
  onDelete?: () => void;
  /** Igual que `editBlockedReason`, para la baja: la opción se ve apagada y el motivo va en su nombre accesible. */
  deleteBlockedReason?: string;
  /** Texto de la baja según la pantalla ("Eliminar", "Dar de baja", "Desactivar"). */
  deleteLabel?: string;
  /** Lo demás va en el menú ⋯ al final de la fila. */
  actions?: RowAction[];
}

/** Lugar vacío del tamaño de un botón: mantiene la posición de los demás. */
const Slot = () => <span aria-hidden="true" className="h-8 w-8 shrink-0" />;

/**
 * Acciones de una fila: Ver y Editar como botones con ícono, en ese orden, y todo lo demás —la baja incluida, al
 * final— dentro del menú ⋯, para que lo destructivo no quede a la vista en cada fila. Lo que no aplica a la entidad no
 * se muestra. Los clics no llegan a la fila (que también abre el detalle).
 */
export const RowActions = ({
  rowLabel,
  onView,
  onEdit,
  editBlockedReason,
  onDelete,
  deleteBlockedReason,
  deleteLabel = 'Eliminar',
  actions = [],
}: Props) => {
  const layout = useContext(RowActionsLayoutContext);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const stop = (event: MouseEvent) => event.stopPropagation();

  const editable = Boolean(onEdit) || Boolean(editBlockedReason);
  const leading: RowAction[] =
    layout === 'menu'
      ? [
          ...(onView ? [{ label: 'Ver', icon: Eye, onClick: onView }] : []),
          ...(editable
            ? [
                {
                  label: 'Editar',
                  icon: Pencil,
                  onClick: onEdit ?? (() => undefined),
                  blockedReason: editBlockedReason,
                },
              ]
            : []),
        ]
      : [];
  const extra = [...leading, ...actions];
  const removal: RowAction | null =
    onDelete || deleteBlockedReason
      ? {
          label: deleteLabel,
          icon: Trash2,
          onClick: onDelete ?? (() => undefined),
          tone: 'danger',
          blockedReason: deleteBlockedReason,
        }
      : null;
  const menuItems = removal ? [...extra, removal] : extra;

  const viewButton = onView ? <IconButton label={`Ver ${rowLabel}`} icon={<Eye />} onClick={onView} /> : null;
  const editButton = editBlockedReason ? (
    <IconButton
      label={`Editar ${rowLabel} (no disponible: ${editBlockedReason})`}
      icon={<Pencil />}
      aria-disabled="true"
      className="cursor-not-allowed opacity-50"
      onClick={() => undefined}
    />
  ) : onEdit ? (
    <IconButton label={`Editar ${rowLabel}`} icon={<Pencil />} onClick={onEdit} />
  ) : null;

  const renderItem = ({ label, icon: Icon, onClick, tone = 'neutral', blockedReason }: RowAction) => (
    <MenuItem
      key={label}
      aria-disabled={blockedReason ? true : undefined}
      aria-label={blockedReason ? `${label} (no disponible: ${blockedReason})` : undefined}
      title={blockedReason}
      onClick={() => {
        if (blockedReason) return;
        setAnchor(null);
        onClick();
      }}
      sx={{
        ...(tone === 'danger' ? { color: 'error.main' } : {}),
        ...(blockedReason ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
      }}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      {label}
    </MenuItem>
  );

  const moreButton =
    menuItems.length > 0 ? (
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
        >
          {extra.map(renderItem)}
          {removal && extra.length > 0 && <Divider />}
          {removal && renderItem(removal)}
        </Menu>
      </>
    ) : null;

  if (layout === 'menu') {
    return (
      <div className="flex items-center justify-end" onClick={stop}>
        {moreButton}
      </div>
    );
  }

  const slots = layout === 'slots';
  return (
    <div className="flex items-center justify-end gap-2" onClick={stop}>
      {viewButton ?? (slots && <Slot />)}
      {editButton ?? (slots && <Slot />)}
      {moreButton ?? (slots && <Slot />)}
    </div>
  );
};
