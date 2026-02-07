import palette from '../../../theme/pallete';
// import { NotificationDropDown } from './components/NotificationDropdown'; // COMENTADO

export const Navbar = () => {
  // --- ESTADOS Y REF DE NOTIFICACIONES COMENTADOS ---
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // const [notifications, setNotifications] = useState<any[]>([]);
  // const dropdownRef = useRef<HTMLDivElement | null>(null);
  // const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- LOGICA DEL DROPDOWN COMENTADA ---
  // const toggleDropdown = () => {
  //   setIsDropdownOpen((prev) => !prev);
  // };

  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (
  //       dropdownRef.current &&
  //       !dropdownRef.current.contains(event.target as Node)
  //     ) {
  //       setIsDropdownOpen(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);

  return (
    <div className="min-h-full">
      <nav
        style={{ backgroundColor: palette.secondary.blackLike }}
        className="relative"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center ml-auto space-x-6">
              {/* --- BOTÓN CAMPANA Y TOOLTIP COMENTADO --- */}
              {/* <Tooltip title="Notificaciones" arrow>
                <button
                  type="button"
                  className="relative flex items-center justify-center rounded-full p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none transition-all duration-300"
                  onClick={toggleDropdown}
                >
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  )}
                  <BellIcon aria-hidden="true" className="h-6 w-6" />
                </button>
              </Tooltip> 
              */}
            </div>
          </div>
        </div>

        {/* --- COMPONENTE DROPDOWN COMENTADO --- */}
        {/* <NotificationDropDown
          isOpen={isDropdownOpen}
          onClose={toggleDropdown}
          dropdownRef={dropdownRef}
          notifications={notifications}
        /> 
        */}
      </nav>

      {/* --- AUDIO COMENTADO --- */}
      {/* <audio ref={audioRef} src="/public/nexus_5_notificacion.mp3" preload="auto" /> */}
    </div>
  );
};
