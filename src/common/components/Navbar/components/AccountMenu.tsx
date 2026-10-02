import { useState, type MouseEvent } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../../hooks';
import { Avatar } from '../../ui/Avatar';

/** El avatar del admin logueado: abre el menú con la entrada a "Mi cuenta". */
export const AccountMenu = () => {
  const navigate = useNavigate();
  const { fullName, email } = useAppSelector((state) => state.auth);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const name = fullName ?? email ?? 'Administrador';

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const handleClose = () => setAnchor(null);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Menú de la cuenta"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        className="grid h-9 w-9 place-items-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar name={name} />
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: '!mt-1 !min-w-[200px] !rounded-xl !border !border-outline !shadow-lg' } }}
      >
        <div className="border-b border-outline px-4 pb-2.5 pt-2">
          <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
          {email && <p className="truncate text-xs text-muted">{email}</p>}
        </div>
        <MenuItem
          onClick={() => {
            handleClose();
            navigate('/account');
          }}
          className="!gap-2.5 !py-2 !text-[13px] !text-ink"
        >
          <ListItemIcon className="text-ink-2">
            <UserRound aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
          </ListItemIcon>
          <ListItemText>Mi cuenta</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
