import { Tooltip } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { cx } from '../ui/cx';
import type { NavItem } from './navConfig';

const linkClass = (mini: boolean) => {
  const base = cx(
    'relative flex items-center rounded-[9px] py-2 text-[13.5px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-llama-400 focus-visible:ring-offset-2 focus-visible:ring-offset-side',
    mini ? 'justify-center px-0' : 'gap-[11px] px-2.5',
  );
  return ({ isActive }: { isActive: boolean }) =>
    cx(
      base,
      isActive
        ? 'bg-gradient-to-r from-llama-500/[0.16] via-llama-500/[0.06] to-transparent text-white ' +
            'before:absolute before:-left-3.5 before:inset-y-[7px] before:w-[3px] before:rounded-r ' +
            'before:bg-gradient-to-b before:from-llama-300 before:to-llama-500 [&>svg]:text-llama-400'
        : 'text-side-text hover:bg-white/[0.05] hover:text-white',
    );
};

interface Props {
  item: NavItem;
  /** Menú reducido a íconos: el nombre pasa a un tooltip. */
  mini: boolean;
  pendingCount: number;
  onNavigate?: () => void;
}

/** Una pantalla del menú lateral: ícono y nombre, o sólo el ícono con tooltip cuando el menú está reducido. */
export const NavItemLink = ({ item, mini, pendingCount, onNavigate }: Props) => {
  const showCount = Boolean(item.showPendingOrders) && pendingCount > 0;
  return (
    // El Tooltip clona a su hijo y mezcla `className` como texto: por eso envuelve un span y no el NavLink.
    <Tooltip title={mini ? item.title : ''} placement="right" arrow>
      <span className="block">
        <NavLink
          to={item.path}
          className={linkClass(mini)}
          onClick={onNavigate}
          aria-label={mini ? item.title : undefined}
        >
          {({ isActive }) => (
            <>
              <item.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
              {!mini && <span className="truncate">{item.title}</span>}
              {showCount && (
                <span
                  className={cx(
                    'rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums',
                    mini ? 'absolute right-0.5 top-0.5 min-w-[16px] px-1 text-center text-[10px] leading-4' : 'ml-auto',
                    isActive || mini ? 'bg-llama-500 text-white' : 'bg-white/[0.08] text-white',
                  )}
                  aria-label={`${pendingCount} pedidos esperando chofer`}
                >
                  {pendingCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      </span>
    </Tooltip>
  );
};
