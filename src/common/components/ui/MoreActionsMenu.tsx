import { useState, type ReactNode } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { EllipsisVertical } from 'lucide-react';
import { IconButton } from './IconButton';

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Por qué está deshabilitada (tooltip nativo). */
  title?: string;
  /** La acción existe pero hoy no se puede: queda apagada y el motivo va en `title`. */
  blockedReason?: string;
  /** Acción destructiva: el texto va en rojo. */
  tone?: 'neutral' | 'danger';
}

interface Props {
  actions: MenuAction[];
  /** Nombre accesible del botón ⋮. */
  label?: string;
}

/** El menú ⋮ de acciones secundarias, compartido por la barra de herramientas y el encabezado de página. */
export const MoreActionsMenu = ({ actions, label = 'Más' }: Props) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (actions.length === 0) return null;
  return (
    <>
      <IconButton
        label={label}
        icon={<EllipsisVertical />}
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
        {actions.map(({ label: text, icon, onClick, disabled, title, blockedReason, tone }) => (
          <MenuItem
            key={text}
            disabled={disabled || Boolean(blockedReason)}
            title={blockedReason ?? title}
            sx={tone === 'danger' ? { color: 'error.main' } : undefined}
            onClick={() => {
              setAnchor(null);
              if (!disabled && !blockedReason) onClick();
            }}
          >
            {icon && (
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 items-center justify-center [&_svg]:h-4 [&_svg]:w-4"
              >
                {icon}
              </span>
            )}
            {text}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
