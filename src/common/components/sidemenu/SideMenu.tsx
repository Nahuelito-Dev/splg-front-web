import { Drawer } from '@mui/material';
import { useAppSelector, useLogout, usePermissions } from '../../../hooks';
import { cx } from '../ui/cx';
import { NavToggleButton } from './NavToggleButton';
import { SideMenuContent } from './SideMenuContent';

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Escritorio: reducido a íconos. */
  mini: boolean;
  onToggleMini: () => void;
}

/** Menú lateral: fijo en escritorio (reducible a íconos), drawer accesible (foco atrapado, Escape) en móvil. */
export const SideMenu = ({ mobileOpen, onCloseMobile, mini, onToggleMini }: Props) => {
  const { fullName } = useAppSelector((state) => state.auth);
  const { isSuperAdminRole: isSuperAdmin } = usePermissions();
  const handleLogout = useLogout();

  return (
    <>
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-side-line transition-[width] duration-200 lg:block',
          mini ? 'w-[76px]' : 'w-64',
        )}
      >
        <SideMenuContent isSuperAdmin={isSuperAdmin} fullName={fullName} mini={mini} onLogout={handleLogout} />
        <NavToggleButton mini={mini} onToggle={onToggleMini} />
      </aside>
      <Drawer
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: 272, border: 0 } }}
      >
        <SideMenuContent
          isSuperAdmin={isSuperAdmin}
          fullName={fullName}
          onNavigate={onCloseMobile}
          onLogout={handleLogout}
        />
      </Drawer>
    </>
  );
};
