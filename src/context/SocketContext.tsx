import { useEffect, type ReactNode } from 'react';
import { useAppSelector } from '../hooks/reduxHooks';
import { useSocket, type SocketAuthPayload } from '../hooks/useSocket';
import { SocketContext } from './socketContextValue';

// El panel se conecta al namespace 'admin' del backend (AdminGateway), que
// valida el token de Firebase en el handshake y mete al socket en la sala global
// de admins para recibir los eventos del ciclo de vida de los pedidos.
const SOCKET_NAMESPACE = '/admin';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { status, uid, role } = useAppSelector((state) => state.auth);
  const { isOnline, connect, disconnect, subscribe } = useSocket(SOCKET_NAMESPACE);

  useEffect(() => {
    if (status !== 'authenticated' || !uid) {
      disconnect();
      return;
    }

    // El AdminGateway valida el token de Firebase en el handshake. Lo tomamos del
    // localStorage donde el thunk de login ya lo guardó (misma fuente que la API
    // REST). TODO: refrescar con getIdToken() si expira (los ID token duran 1h).
    const token = localStorage.getItem('token');
    const auth: SocketAuthPayload = { token, uid, role };
    connect(auth);

    return () => disconnect();
  }, [status, uid, role, connect, disconnect]);

  return <SocketContext.Provider value={{ isOnline, subscribe }}>{children}</SocketContext.Provider>;
};
