import { Drawer } from '@mui/material';
import { useAppDispatch, useAppSelector, usePermissions } from '../../../hooks';
import { startLogOut } from '../../../store/auth/thunks';
import { THEME_MODE_KEY } from '../../../theme/themeMode';
import { SideMenuContent } from './SideMenuContent';

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/** Menú lateral: fijo en escritorio, drawer accesible (foco atrapado, Escape) en móvil. */
export const SideMenu = ({ mobileOpen, onCloseMobile }: Props) => {
  const dispatch = useAppDispatch();
  const { fullName } = useAppSelector((state) => state.auth);
  const { isSuperAdmin } = usePermissions();

  const handleLogout = () => {
    // El tema (claro/oscuro/sistema) es una preferencia del dispositivo, no de la
    // sesión: se guarda antes de limpiar y se vuelve a poner después.
    const themeMode = localStorage.getItem(THEME_MODE_KEY);
    localStorage.clear();
    if (themeMode) localStorage.setItem(THEME_MODE_KEY, themeMode);
    void dispatch(startLogOut());
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-side-line lg:block">
        <SideMenuContent isSuperAdmin={isSuperAdmin} fullName={fullName} onLogout={handleLogout} />
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
