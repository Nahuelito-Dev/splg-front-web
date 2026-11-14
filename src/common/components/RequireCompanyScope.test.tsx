import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ mode: 'platform' as 'platform' | 'support' | 'company' }));
vi.mock('../../hooks', () => ({
  usePermissions: () => ({ mode: state.mode }),
  useSupportSession: () => ({ session: null }),
}));
vi.mock('../support/RequestSupportModal', () => ({ RequestSupportModal: () => null }));

import { RequireCompanyAdmin, RequireCompanyScope } from './RequireCompanyScope';

const renderAt = (guard: 'company' | 'admin') =>
  render(
    <MemoryRouter initialEntries={['/orders']}>
      <Routes>
        <Route element={guard === 'company' ? <RequireCompanyScope /> : <RequireCompanyAdmin />}>
          <Route path="orders" element={<p>Pedidos de la empresa</p>} />
        </Route>
        <Route path="home" element={<p>Inicio</p>} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('RequireCompanyScope', () => {
  it('el administrador general sin sesión no ve la pantalla aunque entre por URL: se le ofrece pedir acceso', () => {
    state.mode = 'platform';
    renderAt('company');
    expect(screen.queryByText('Pedidos de la empresa')).not.toBeInTheDocument();
    expect(screen.getByText('Es una pantalla de una empresa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedir acceso de soporte/ })).toBeInTheDocument();
  });

  it.each(['support', 'company'] as const)('en modo %s muestra la pantalla', (mode) => {
    state.mode = mode;
    renderAt('company');
    expect(screen.getByText('Pedidos de la empresa')).toBeInTheDocument();
  });
});

describe('RequireCompanyAdmin', () => {
  it('sólo el admin de la empresa entra', () => {
    state.mode = 'company';
    renderAt('admin');
    expect(screen.getByText('Pedidos de la empresa')).toBeInTheDocument();
  });

  it.each(['platform', 'support'] as const)('el administrador general (%s) vuelve al inicio', (mode) => {
    state.mode = mode;
    renderAt('admin');
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });
});
