import { SideMenuItem } from './SideMenuItem';

import { NavLink } from 'react-router-dom';

import type { IconType } from 'react-icons';
import {
  IoConstruct,
  IoHome,
  IoLogOutOutline,
  IoAccessibility,
} from 'react-icons/io5';

import pallete from '../../../theme/pallete';
import './SideMenu.css';
import palette from '../../../theme/pallete';
import { MainMindLogo } from '../../../assets/images/MainMindLogo';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { startLogOut } from '../../../store/auth/thunks';

interface MenuItem {
  title: string;
  subTitle: string;
  href: string;
  Icon: IconType;
}

const menuItems: MenuItem[] = [
  { title: 'Home', subTitle: 'Leads', href: '/home', Icon: IoHome },
];

export const SideMenu = () => {
  const dispatch = useAppDispatch();
  const { fullName } = useAppSelector((state) => state.auth);
  const handleLogout = () => {
    localStorage.clear();
    dispatch(startLogOut());
  };
  return (
    <div
      id="menu"
      style={{ backgroundColor: palette.secondary.blackLike }}
      className="min-h-screen z-10 text-slate-300 w-80 left-0 overflow-y-hidden"
    >
      {/* <Navbar />*/}
      <div id="logo" className="my-4 px-20">
        {/* Title */}
        <MainMindLogo />
      </div>

      {/*  Profile */}
      <div
        id="profile"
        className="px-6 py-10"
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <p className="text-slate-500" style={{ color: 'white', margin: 0 }}>
          Bienvenido:
        </p>
        <span
          style={{ color: pallete.secondary.light }}
          className="text-sm md:text-base font-bold"
        >
          {fullName}
        </span>
      </div>

      {/* Menu Items */}
      <nav
        id="nav"
        className="w-full px-6 flex flex-col justify-between "
        style={{ height: 'calc(100% - 310px)' }}
      >
        <div>
          {menuItems.map((item) => (
            <SideMenuItem key={item.href} {...item} />
          ))}
        </div>

        {/* Logout */}
        <NavLink to={'/auth/login'}>
          <div>
            <IoLogOutOutline />
          </div>
          <div onClick={handleLogout} className="flex flex-col ">
            <span
              style={{ color: pallete.secondary.contrastText }}
              className="text-lg font-bold leading-5"
            >
              Logout
            </span>
            <span
              style={{ color: pallete.secondary.contrastText }}
              className="text-sm hidden md:block"
            >
              Cerrar sesión
            </span>
          </div>
        </NavLink>
      </nav>
    </div>
  );
};
