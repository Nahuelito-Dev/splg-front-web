import { NavLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { startLogOut } from '../../../store/auth/thunks';
import { YennigasLogo } from '../../components/YennigasLogo';

// Iconos
import {
  IoHomeOutline,
  IoFlameOutline,
  IoPeopleOutline,
  IoBicycleOutline,
  IoReceiptOutline,
  IoPersonOutline,
  IoLogOutOutline,
  IoCarOutline,
  IoSettingsOutline, // <--- Para Configuración
  IoAlertCircleOutline, // <--- Para Reclamos
  IoBarChartOutline, // <--- Para Reportes
} from 'react-icons/io5';

interface MenuItem {
  title: string;
  href: string;
  Icon: any;
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', href: '/home', Icon: IoHomeOutline },
  { title: 'Garrafas', href: '/cylinders', Icon: IoFlameOutline },
  { title: 'Clientes', href: '/customers', Icon: IoPeopleOutline },
  { title: 'Deliveries', href: '/deliveries', Icon: IoBicycleOutline },
  { title: 'Vehículos', href: '/cars', Icon: IoCarOutline },
  { title: 'Ordenes', href: '/ordenes', Icon: IoReceiptOutline }, // Corregí el href a /orders para coincidir con tus rutas
  { title: 'Configuracion', href: '/configuracion', Icon: IoSettingsOutline }, // Corregí el href a /configuration
  { title: 'Reclamos', href: '/claims', Icon: IoAlertCircleOutline },
  { title: 'Reportes', href: '/reports', Icon: IoBarChartOutline },
  { title: 'Usuarios', href: '/users', Icon: IoPersonOutline },
];

export const SideMenu = () => {
  const dispatch = useAppDispatch();
  const { fullName } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    localStorage.clear();
    dispatch(startLogOut());
  };

  return (
    // Fondo oscuro sólido para coincidir con la app
    <aside className="w-72 h-screen bg-[#0f1014] text-white flex flex-col fixed left-0 top-0 z-50 border-r border-slate-800">
      {/* Logo Area */}
      <div className="h-28 flex items-center justify-center border-b border-slate-800/50">
        <div className="scale-75">
          <YennigasLogo textSize="text-4xl" />
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-[#f43f5e] p-0.5">
          <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-[#f43f5e] font-bold">
            {fullName?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs text-slate-400">Hola,</span>
          <span
            className="text-sm font-bold text-slate-100 truncate w-full"
            title={fullName || ''}
          >
            {fullName || 'Admin'}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-2 custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${
                isActive
                  ? 'bg-[#f43f5e] text-white shadow-lg shadow-pink-500/20 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            <item.Icon className="text-xl" />
            <span className="text-sm tracking-wide">{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all duration-200 group"
        >
          <IoLogOutOutline className="text-2xl group-hover:-translate-x-1 transition-transform" />
          <div className="flex flex-col items-start">
            <span className="font-bold leading-none text-sm">
              Cerrar Sesión
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
};
