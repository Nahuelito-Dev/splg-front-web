import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useAppSelector } from '../hooks/reduxHooks';
import { SocketAuthPayload, useSocket } from '../hooks/useSocket';

interface SocketContextValue {
  isOnline: boolean;
  subscribe: <T = unknown>(
    event: string,
    handler: (payload: T) => void,
  ) => () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(
  undefined,
);

// El panel se conecta al namespace 'admin' del backend (AdminGateway), que
// valida el token de Firebase en el handshake y mete al socket en la sala global
// de admins para recibir los eventos del ciclo de vida de los pedidos.
const SOCKET_NAMESPACE = '/admin';

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { status, uid, role } = useAppSelector((state) => state.auth);
  const { isOnline, connect, disconnect, subscribe } = useSocket(
    SOCKET_NAMESPACE,
  );

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

  return (
    <SocketContext.Provider value={{ isOnline, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error(
      'useSocketContext debe usarse dentro de un <SocketProvider>',
    );
  }
  return context;
};
