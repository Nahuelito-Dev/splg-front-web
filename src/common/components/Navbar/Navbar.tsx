import { Menu } from 'lucide-react';
import { usePermissions } from '../../../hooks';
import { SupportHelpButton } from '../../../features/chat/SupportHelpButton';
import { AccountMenu } from './components/AccountMenu';
import { Breadcrumbs } from './components/Breadcrumbs';
import { NotificationBell } from './components/NotificationBell';
import { SearchButton } from './components/SearchButton';
import { ThemeModeToggle } from './components/ThemeModeToggle';
import { SupportModeButton } from './components/SupportModeButton';

interface Props {
  /** Sólo se usa en móvil: abre el menú lateral como drawer. */
  onOpenMenu: () => void;
}

export const Navbar = ({ onOpenMenu }: Props) => {
  const { isSuperAdmin } = usePermissions();
  return (
    <header className="flex h-[60px] items-center gap-2 border-b border-outline bg-surface/85 px-3 backdrop-blur sm:gap-4 sm:px-6 lg:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-outline text-ink-2 transition-colors hover:bg-surface-hover lg:hidden"
      >
        <Menu aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
      <Breadcrumbs className="hidden sm:block" />
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <SearchButton />
        {isSuperAdmin && <SupportModeButton />}
        <ThemeModeToggle />
        <SupportHelpButton />
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  );
};
