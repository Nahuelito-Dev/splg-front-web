import { useState } from 'react';
import { Tooltip } from '@mui/material';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAppSelector } from '../../../hooks';
import { useOrders } from '../../../services/queries/orders';
import { useMyAccount } from '../../../services/queries/users';
import { CompanyBrand, PoweredByPlatform } from '../CompanyBrand';
import { LogoSplg } from '../LogoSplg';
import { cx } from '../ui/cx';
import { MyAvatar } from '../MyAvatar';
import { initialsOf } from '../../../utils/format';
import { NavItemLink } from './NavItemLink';
import { NAV_SECTIONS } from './navConfig';
import { isNavItemVisible } from './navScope';
import { useNavViewer } from './useNavViewer';
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

interface Props {
  /** La cuenta es de un administrador general (esté o no en modo soporte): sólo para la etiqueta del pie. */
  isSuperAdmin: boolean;
  fullName: string | null;
  /** Reducido a íconos (sólo escritorio). */
  mini?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}

export const SideMenuContent = ({ isSuperAdmin, fullName, mini = false, onNavigate, onLogout }: Props) => {
  const viewer = useNavViewer();
  // Pedidos esperando chofer: el mismo número que muestra Pedidos filtrado por "Pendiente". En la plataforma no hay
  // pedidos (la API responde 403 SUPPORT_SESSION_REQUIRED): no se pide.
  const { data: pending } = useOrders(
    PENDING,
    { status: 'pending' },
    { refetchInterval: 30_000, enabled: viewer.mode !== 'platform' },
  );
  const pendingCount = pending?.total ?? 0;
  const { email } = useAppSelector((state) => state.auth);
  const { data: account } = useMyAccount(email);
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
      {/* La plataforma lleva la marca de la plataforma; una empresa, la suya (su Apariencia). */}
      {viewer.mode === 'platform' ? (
        <LogoSplg
          subtitle={mini ? undefined : 'Gestión de reparto'}
          markOnly={mini}
          className={cx('relative', mini ? 'justify-center' : 'px-1.5')}
        />
      ) : (
        <CompanyBrand
          subtitle={mini ? undefined : 'Gestión de reparto'}
          markOnly={mini}
          className={cx('relative', mini ? 'justify-center' : 'px-1.5')}
        />
      )}
      {/* En la empresa del admin el encabezado ya la nombra; en soporte y en la propia, la tarjeta dice cómo se mira. */}
      {viewer.mode !== 'company' && <TenantCard mini={mini} onNavigate={onNavigate} />}

      <nav aria-label="Secciones del panel" className="relative -mx-3.5 flex-1 space-y-1.5 overflow-y-auto px-3.5">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => isNavItemVisible(item, viewer));
          if (items.length === 0) return null;
          const isOpen = mini || !collapsed.includes(section.title);
          const panelId = `nav-section-${section.title}`;
          return (
            <div
              key={section.title}
              className={cx('pt-3.5 first:pt-0', mini && 'border-t border-side-line first:border-0')}
            >
              {!mini && (
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
              )}
              {isOpen && (
                <div id={panelId} className="space-y-0.5">
                  {items.map((item) => (
                    <NavItemLink
                      key={item.path}
                      item={item}
                      mini={mini}
                      pendingCount={pendingCount}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {viewer.mode !== 'platform' && !mini && <PoweredByPlatform className="relative -mb-2" />}
      <div
        className={cx(
          'relative flex items-center rounded-[11px] border border-side-line',
          mini ? 'justify-center py-2' : 'gap-2.5 p-2.5',
        )}
      >
        {!mini && (
          <>
            <MyAvatar
              name={fullName ?? 'Administrador'}
              photoUrl={account?.photoUrl}
              fallback={
                <span
                  aria-hidden="true"
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-tinta-600 to-tinta-800 text-[11px] font-semibold text-white"
                >
                  {initialsOf(fullName ?? 'A')}
                </span>
              }
            />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-semibold text-white" title={fullName ?? undefined}>
                {fullName ?? 'Administrador'}
              </span>
              <span className="block text-[11px] font-medium">
                {isSuperAdmin ? 'Administrador general' : 'Administrador'}
              </span>
            </span>
          </>
        )}
        <Tooltip title="Cerrar sesión" placement="right" arrow>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-side-text transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-llama-400"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
