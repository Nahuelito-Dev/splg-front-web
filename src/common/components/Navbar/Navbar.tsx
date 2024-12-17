import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import Tooltip from '@mui/material/Tooltip';
import palette from '../../../theme/pallete';
import { NotificationDropDown } from './components/NotificationDropdown';
import { io, Socket } from 'socket.io-client';

export const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]); // Almacena notificaciones
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Referencia para el sonido
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toggle para abrir o cerrar el dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  // Conexión a WebSocket para recibir notificaciones en tiempo real
  useEffect(() => {
    const socket: Socket = io('http://localhost:3000'); // URL del servidor WebSocket

    // Escucha el evento 'new-notification' y actualiza las notificaciones
    socket.on('new-notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]); // Agrega nuevas notificaciones al inicio

      // Reproducir el sonido cuando llega una nueva notificación
      if (audioRef.current) {
        audioRef.current.play(); // Reproduce el sonido
      }
    });

    // Desconecta el socket al desmontar el componente
    return () => {
      socket.disconnect();
    };
  }, []);

  // Cierra el dropdown si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-full">
      <nav
        style={{ backgroundColor: palette.secondary.blackLike }}
        className="relative"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center ml-auto space-x-6">
              <Tooltip title="Notificaciones" arrow>
                <button
                  type="button"
                  className="relative flex items-center justify-center rounded-full p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none transition-all duration-300"
                  onClick={toggleDropdown}
                >
                  {notifications.length > 0 && ( // Mostrar badge solo si hay notificaciones
                    <span className="absolute top-0 right-0 inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                  )}
                  <BellIcon aria-hidden="true" className="h-6 w-6" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Componente NotificationDropdown */}
        <NotificationDropDown
          isOpen={isDropdownOpen}
          onClose={toggleDropdown}
          dropdownRef={dropdownRef}
          notifications={notifications} // Pasamos las notificaciones dinámicas
        />
      </nav>

      {/* Audio para la notificación */}
      <audio ref={audioRef} src="/public/nexus_5_notificacion.mp3" preload="auto" />
    </div>
  );
};
