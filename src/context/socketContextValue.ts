import { createContext } from 'react';

export interface SocketContextValue {
  isOnline: boolean;
  subscribe: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);
