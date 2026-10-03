import { useState, type ReactNode } from 'react';
import { Navbar, SideMenu } from '../components';
import { NAV_MINI_KEY, useStoredFlag } from '../../hooks';
import { cx } from '../components/ui/cx';
import { DistributorNotice } from './DistributorNotice';

interface Props {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: Props) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navMini, setNavMini] = useStoredFlag(NAV_MINI_KEY);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SideMenu
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        mini={navMini}
        onToggleMini={() => setNavMini(!navMini)}
      />

      {/* El padding es el ancho exacto del menú lateral fijo en escritorio (completo o reducido a íconos). */}
      <div
        className={cx(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          navMini ? 'lg:pl-[76px]' : 'lg:pl-64',
        )}
      >
        <Navbar onOpenMenu={() => setMobileNavOpen(true)} />
        <DistributorNotice />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
