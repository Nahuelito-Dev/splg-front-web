import { useEffect, type ReactNode } from 'react';
import { useAppSelector } from '../hooks/reduxHooks';
import { useSocket, type SocketAuthPayload } from '../hooks/useSocket';
import { getCurrentIdToken } from '../firebase/providers';
import { SocketContext } from './socketContextValue';

// El panel se conecta al namespace 'admin' del backend (AdminGateway), que
// valida el token de Firebase en el handshake y mete al socket en la sala global
// de admins para recibir los eventos del ciclo de vida de los pedidos.
const SOCKET_NAMESPACE = '/admin';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { status, uid, role } = useAppSelector((state) => state.auth);
  const { isOnline, connect, disconnect, subscribe, emit, request } = useSocket(SOCKET_NAMESPACE);

  useEffect(() => {
    if (status !== 'authenticated' || !uid) {
      disconnect();
      return;
    }

    // El AdminGateway valida el token de Firebase en el handshake. Se pide uno vigente
    // en cada (re)conexión: los ID token duran una hora.
    connect(async (): Promise<SocketAuthPayload> => {
      const token = (await getCurrentIdToken().catch(() => null)) ?? localStorage.getItem('token');
      return { token, uid, role };
    });

    return () => disconnect();
  }, [status, uid, role, connect, disconnect]);

  return <SocketContext.Provider value={{ isOnline, subscribe, emit, request }}>{children}</SocketContext.Provider>;
};
