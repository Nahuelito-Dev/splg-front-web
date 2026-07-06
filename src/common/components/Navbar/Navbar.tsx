import palette from '../../../theme/pallete';
import { NotificationBell } from './components/NotificationBell';

export const Navbar = () => {
  return (
    <div className="min-h-full">
      <nav
        style={{ backgroundColor: palette.secondary.blackLike }}
        className="relative"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center ml-auto space-x-6">
              <NotificationBell />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
