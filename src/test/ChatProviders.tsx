import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SocketContext, type SocketContextValue } from '../context/socketContextValue';

/** React Query + socket falso + router, como los monta la app. */
export const ChatProviders = ({
  children,
  client,
  socket,
  url = '/',
}: {
  children: ReactNode;
  client: QueryClient;
  socket: SocketContextValue;
  url?: string;
}) => (
  <QueryClientProvider client={client}>
    <SocketContext.Provider value={socket}>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </SocketContext.Provider>
  </QueryClientProvider>
);
