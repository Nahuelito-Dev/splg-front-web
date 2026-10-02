import { Menu } from 'lucide-react';
import { AccountMenu } from './components/AccountMenu';
import { NotificationBell } from './components/NotificationBell';
import { ThemeModeToggle } from './components/ThemeModeToggle';

interface Props {
  /** Sólo se usa en móvil: abre el menú lateral como drawer. */
  onOpenMenu: () => void;
}

export const Navbar = ({ onOpenMenu }: Props) => (
  <header className="sticky top-0 z-20 flex h-[60px] items-center gap-4 border-b border-outline bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-7">
    <button
      type="button"
      onClick={onOpenMenu}
      aria-label="Abrir menú"
      className="-ml-1 grid h-9 w-9 place-items-center rounded-[10px] border border-outline text-ink-2 transition-colors hover:bg-surface-hover lg:hidden"
    >
      <Menu aria-hidden="true" className="h-[18px] w-[18px]" />
    </button>
    <div className="flex-1" />
    <div className="flex items-center gap-2.5">
      <ThemeModeToggle />
      <NotificationBell />
      <AccountMenu />
    </div>
  </header>
);
