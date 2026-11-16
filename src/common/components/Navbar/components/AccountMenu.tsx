import { useState, type MouseEvent } from 'react';
import { Popover } from '@mui/material';
import { LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector, useLogout, usePermissions } from '../../../../hooks';
import { useMyAccount } from '../../../../services/queries/users';
import { MyAvatar } from '../../MyAvatar';

const ITEM =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none';

/** Menú de la cuenta (modelo `account-popover` de Minimal): avatar, nombre, rol y accesos a Mi cuenta y salir. */
export const AccountMenu = () => {
  const logout = useLogout();
  const { isSuperAdmin } = usePermissions();
  const { fullName, email } = useAppSelector((state) => state.auth);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { data: account } = useMyAccount(email);
  const name = fullName ?? email ?? 'Administrador';

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const handleClose = () => setAnchor(null);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Menú de la cuenta"
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-outline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-primary/40"
      >
        <MyAvatar name={name} photoUrl={account?.photoUrl} />
      </button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { className: '!mt-2 !w-[260px]' },
        }}
      >
        <div className="flex flex-col items-center gap-1 border-b border-outline px-4 pb-3.5 pt-4 text-center">
          <MyAvatar name={name} photoUrl={account?.photoUrl} size="lg" />
          <p className="mt-1 max-w-full truncate text-sm font-semibold text-ink">{name}</p>
          {email && email !== name && <p className="max-w-full truncate text-xs text-muted">{email}</p>}
          <span className="mt-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-strong">
            {isSuperAdmin ? 'Administrador general' : 'Administrador'}
          </span>
        </div>
        <div className="p-1.5">
          <Link to="/account" onClick={handleClose} className={ITEM}>
            <UserRound aria-hidden="true" className="h-4 w-4 text-ink-2" strokeWidth={1.8} />
            Mi cuenta
          </Link>
          <button
            type="button"
            onClick={() => {
              handleClose();
              void logout();
            }}
            className={ITEM}
          >
            <LogOut aria-hidden="true" className="h-4 w-4 text-ink-2" strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </div>
      </Popover>
    </>
  );
};
