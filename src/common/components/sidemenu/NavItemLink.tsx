import { Tooltip } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import { cx } from '../ui/cx';
import { InboxNavBadge } from '../../../features/chat/components/InboxNavBadge';
import { SupportNavBadge } from '../../../features/chat/components/SupportNavBadge';
import { NAV_SECTIONS, type NavItem } from './navConfig';

const linkClass = (mini: boolean) => {
  const base = cx(
    'relative flex items-center rounded-[9px] py-2 text-[13.5px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-side-accent focus-visible:ring-offset-2 focus-visible:ring-offset-side',
    mini ? 'justify-center px-0' : 'gap-[11px] px-2.5',
  );
  return ({ isActive }: { isActive: boolean }) =>
    cx(
      base,
      isActive
        ? 'bg-gradient-to-r from-primary/[0.16] via-primary/[0.06] to-transparent text-white ' +
            'before:absolute before:-left-3.5 before:inset-y-[7px] before:w-[3px] before:rounded-r ' +
            'before:bg-gradient-to-b before:from-primary-from before:to-primary-to [&>svg]:text-side-accent'
        : 'text-side-text hover:bg-white/[0.05] hover:text-white',
    );
};

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * ¿Hay otro ítem del menú, con una ruta más específica, que también coincide? (`/employees` coincide con
 * `/employees/positions`, pero el activo tiene que ser sólo «Puestos»).
 */
const isShadowed = (pathname: string, item: Pick<NavItem, 'path'>): boolean =>
  NAV_SECTIONS.some((section) =>
    section.items.some((other) => other.path.length > item.path.length && matches(pathname, other.path)),
  );

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
  const { pathname } = useLocation();
  const shadowed = isShadowed(pathname, item);
  return (
    // El Tooltip clona a su hijo y mezcla `className` como texto: por eso envuelve un span y no el NavLink.
    <Tooltip title={mini ? item.title : ''} placement="right" arrow>
      <span className="block">
        <NavLink
          to={item.path}
          className={linkClass(mini)}
          end={shadowed}
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
                    isActive || mini ? 'bg-primary text-on-primary' : 'bg-white/[0.08] text-white',
                  )}
                  aria-label={`${pendingCount} pedidos esperando chofer`}
                >
                  {pendingCount}
                </span>
              )}
              {item.supportBadge && <SupportNavBadge which={item.supportBadge} mini={mini} active={isActive} />}
              {item.inboxBadge && <InboxNavBadge mini={mini} active={isActive} />}
            </>
          )}
        </NavLink>
      </span>
    </Tooltip>
  );
};
