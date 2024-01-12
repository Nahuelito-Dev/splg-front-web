import { SideMenuItem } from './SideMenuItem';

import { NavLink } from 'react-router-dom';

import type { IconType } from 'react-icons';
import { IoConstruct, IoHome, IoLogOutOutline, IoAccessibility } from 'react-icons/io5';

import pallete from '../../../theme/pallete';
import './SideMenu.css';
import { MainMindLogo } from '../../../../public/images/MainMindLogo';
import palette from '../../../theme/pallete';


interface MenuItem {
  title: string;
  subTitle: string;
  href: string;
  Icon: IconType;
}

const menuItems: MenuItem[] = [
  { title: 'Home', subTitle: 'Visualizar data', href: '/home', Icon: IoHome },
  { title: 'Usuarios', subTitle: 'Gestionar usuarios', href: '/users', Icon: IoAccessibility },
  { title: 'Membresias', subTitle: 'Gestionar membresias', href: '/memberships', Icon: IoConstruct },
];




export const SideMenu = () => {

  return (
    <div id="menu" style={{ backgroundColor: palette.secondary.main }} className="min-h-screen z-10 text-slate-300 w-80 left-0 overflow-y-hidden">
      <div id="logo" className="my-4 px-16">
        {/* Title */}
        <MainMindLogo />
      </div>

      {/*  Profile */}
      <div id="profile" className="px-6 py-10">
        <p className="text-slate-500" style={{ color: pallete.secondary.contrastText }}>Bienvenido,</p>
        <a href="#" className="inline-flex space-x-2 items-center">
          <span style={{ color: pallete.secondary.contrastText }} className="text-sm md:text-base font-bold">
            Admin Admin
          </span>
        </a>
      </div>

      {/* Menu Items */}
      <nav id="nav" className="w-full px-6 flex flex-col justify-between " style={{height: 'calc(100% - 310px)'}}>
        <div>
          {
            menuItems.map(item => (
              <SideMenuItem key={item.href} {...item} />
            ))
          }
        </div>

        {/* Logout */}
        <NavLink to={'/auth/login'}>
          <div>
            <IoLogOutOutline />
          </div>
          <div className="flex flex-col ">
            <span style={{ color: pallete.secondary.contrastText }} className="text-lg font-bold leading-5">Logout</span>
            <span style={{ color: pallete.secondary.contrastText }} className="text-sm hidden md:block">Cerrar sesión</span>
          </div>
        </NavLink>

      </nav>
    </div>
  );
};