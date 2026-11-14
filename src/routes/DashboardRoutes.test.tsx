import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../common/layout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../common/layout/RouteProgressBar', () => ({ RouteProgressBar: () => null }));
vi.mock('../common/components/Spinner', () => ({ CheckingAuth: () => <p>Revisando la sesión</p> }));
vi.mock('../hooks/useSupportEndedEvent', () => ({ useSupportEndedEvent: vi.fn() }));
const sync = vi.hoisted(() => vi.fn());
vi.mock('../services/queries/supportSessions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSupportModeSync: (enabled: boolean) => sync(enabled) as unknown,
}));

import { store } from '../store/store';
import { login } from '../store/auth';
import { supportMode } from '../services/api/supportMode';
import { DashboardRoutes } from './DashboardRoutes';

const renderAt = (url: string) =>
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[url]}>
          <DashboardRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );

afterEach(cleanup);

describe('DashboardRoutes', () => {
  it('ignora un expireTimestamp vencido: la sesión la decide Firebase, no una marca local', () => {
    store.dispatch(login({ uid: 'u', email: 'a@b.c', fullName: 'Ana', role: 'admin' }));
    localStorage.setItem('expireTimestamp', String(Date.now() - 3600_000));
    renderAt('/nada');
    expect(store.getState().auth.status).toBe('authenticated');
    expect(sync).toHaveBeenLastCalledWith(false);
  });

  it('el administrador general espera a saber si está en modo soporte y, sin sesión, no ve pedidos ni por URL', () => {
    supportMode.reset();
    store.dispatch(login({ uid: 'u', email: 's@b.c', fullName: 'Sol', role: 'super_admin' }));
    renderAt('/orders');
    expect(sync).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Revisando la sesión')).toBeInTheDocument();
    act(() => supportMode.update(null));
    expect(screen.getByText('Es una pantalla de una empresa')).toBeInTheDocument();
  });
});
