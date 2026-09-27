import { useState, type ReactNode } from 'react';
import { Navbar, SideMenu } from '../components';
import { DistributorNotice } from './DistributorNotice';

interface Props {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: Props) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SideMenu mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      {/* lg:pl-64: el ancho exacto del menú lateral fijo en escritorio. */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Navbar onOpenMenu={() => setMobileNavOpen(true)} />
        <DistributorNotice />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
