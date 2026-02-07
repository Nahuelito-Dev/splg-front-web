import { NavLink } from 'react-router-dom';
import type { IconType } from 'react-icons';

interface Props {
  href: string;
  Icon: IconType;
  title: string;
}

export const SideMenuItem = ({ href, Icon, title }: Props) => {
  return (
    <NavLink
      to={href}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }
      `}
    >
      {/* Icono */}
      <Icon className="text-2xl" />

      {/* Texto */}
      <span className="font-medium text-base tracking-wide">{title}</span>
    </NavLink>
  );
};
