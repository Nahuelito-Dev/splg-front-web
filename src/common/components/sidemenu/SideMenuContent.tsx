import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useOrders } from '../../../services/queries/orders';
import { LogoSplg } from '../LogoSplg';
import { cx } from '../ui/cx';
import { initialsOf } from '../../../utils/format';
import { NAV_SECTIONS } from './navConfig';
import { TenantCard } from './TenantCard';

const PENDING = { page: 0, pageSize: 1 };
const COLLAPSED_SECTIONS_KEY = 'navCollapsedSections';

const readCollapsedSections = (): string[] => {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const writeCollapsedSections = (sections: string[]) => {
  try {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(sections));
  } catch {
    // Sin localStorage, el menú vuelve a abrirse entero en la próxima carga: no rompe nada.
  }
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'relative flex items-center gap-[11px] rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-llama-400 focus-visible:ring-offset-2 focus-visible:ring-offset-side',
    isActive
      ? 'bg-gradient-to-r from-llama-500/[0.16] via-llama-500/[0.06] to-transparent text-white ' +
          'before:absolute before:-left-3.5 before:inset-y-[7px] before:w-[3px] before:rounded-r ' +
          'before:bg-gradient-to-b before:from-llama-300 before:to-llama-500 [&>svg]:text-llama-400'
      : 'text-side-text hover:bg-white/[0.05] hover:text-white',
  );

interface Props {
  isSuperAdmin: boolean;
  fullName: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
}

export const SideMenuContent = ({ isSuperAdmin, fullName, onNavigate, onLogout }: Props) => {
  // Pedidos esperando chofer: el mismo número que muestra Pedidos filtrado por "Pendiente".
  const { data: pending } = useOrders(PENDING, { status: 'pending' }, { refetchInterval: 30_000 });
  const pendingCount = pending?.total ?? 0;
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsedSections);

  const toggleSection = (title: string) => {
    setCollapsed((prev) => {
      const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
      writeCollapsedSections(next);
      return next;
    });
  };

  return (
    <div className="side-glow relative flex h-full flex-col gap-5 overflow-hidden bg-side px-3.5 py-[18px] text-side-text">
      <LogoSplg subtitle="Gestión de reparto" className="relative px-1.5" />
      <TenantCard onNavigate={onNavigate} />

      <nav aria-label="Secciones del panel" className="relative -mx-3.5 flex-1 space-y-1.5 overflow-y-auto px-3.5">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
          if (items.length === 0) return null;
          const isOpen = !collapsed.includes(section.title);
          const panelId = `nav-section-${section.title}`;
          return (
            <div key={section.title} className="pt-3.5 first:pt-0">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between rounded-[9px] px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-side-text/70 transition-colors hover:text-side-text"
              >
                {section.title}
                <ChevronDown
                  aria-hidden="true"
                  className={cx('h-3.5 w-3.5 shrink-0 transition-transform', isOpen ? '' : '-rotate-90')}
                  strokeWidth={2}
                />
              </button>
              {isOpen && (
                <div id={panelId} className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass} onClick={onNavigate}>
                      {({ isActive }) => (
                        <>
                          <item.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
                          <span className="truncate">{item.title}</span>
                          {item.showPendingOrders && pendingCount > 0 && (
                            <span
                              className={cx(
                                'ml-auto rounded-full px-[7px] py-px text-[11px] font-semibold tabular-nums',
                                isActive ? 'bg-llama-500 text-white' : 'bg-white/[0.08] text-white',
                              )}
                              aria-label={`${pendingCount} pedidos esperando chofer`}
                            >
                              {pendingCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="relative flex items-center gap-2.5 rounded-[11px] border border-side-line p-2.5">
        <span
          aria-hidden="true"
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-tinta-600 to-tinta-800 text-[11px] font-semibold text-white"
        >
          {initialsOf(fullName ?? 'A')}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12.5px] font-semibold text-white" title={fullName ?? undefined}>
            {fullName ?? 'Administrador'}
          </span>
          <span className="block text-[11px] font-medium">
            {isSuperAdmin ? 'Administrador general' : 'Administrador'}
          </span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-side-text transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-llama-400"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
