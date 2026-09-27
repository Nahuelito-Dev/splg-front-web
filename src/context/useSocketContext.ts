import { useContext } from 'react';
import { SocketContext } from './socketContextValue';

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext debe usarse dentro de un <SocketProvider>');
  }
  return context;
};
