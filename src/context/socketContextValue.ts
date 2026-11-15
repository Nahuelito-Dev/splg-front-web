import { createContext } from 'react';

export interface SocketContextValue {
  isOnline: boolean;
  subscribe: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
  /** Emite sin esperar respuesta; sin conexión no hace nada. */
  emit: (event: string, payload: unknown) => void;
  /** Emite y espera el ack del servidor; sin conexión, o si no responde a tiempo, rechaza. */
  request: <T = unknown>(event: string, payload: unknown) => Promise<T>;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);
