import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../common/layout', () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../common/layout/RouteProgressBar', () => ({ RouteProgressBar: () => null }));

import { store } from '../store/store';
import { login } from '../store/auth';
import { DashboardRoutes } from './DashboardRoutes';

describe('DashboardRoutes', () => {
  it('ignora un expireTimestamp vencido: la sesión la decide Firebase, no una marca local', () => {
    store.dispatch(login({ uid: 'u', email: 'a@b.c', fullName: 'Ana', role: 'admin' }));
    localStorage.setItem('expireTimestamp', String(Date.now() - 3600_000));
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/nada']}>
          <DashboardRoutes />
        </MemoryRouter>
      </Provider>,
    );
    expect(store.getState().auth.status).toBe('authenticated');
  });
});
