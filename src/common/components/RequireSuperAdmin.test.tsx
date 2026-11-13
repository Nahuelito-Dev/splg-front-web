import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireSuperAdmin } from './RequireSuperAdmin';

const permissions = vi.hoisted(() => ({ isSuperAdmin: false }));
vi.mock('../../hooks', () => ({ usePermissions: () => permissions }));

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={['/system']}>
      <Routes>
        <Route path="/home" element={<p>Inicio</p>} />
        <Route element={<RequireSuperAdmin />}>
          <Route path="/system" element={<p>Herramientas de la plataforma</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('RequireSuperAdmin', () => {
  it('un admin de empresa que entra por URL vuelve al inicio sin ver la pantalla', () => {
    permissions.isSuperAdmin = false;
    renderRoute();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Herramientas de la plataforma')).not.toBeInTheDocument();
  });

  it('el administrador general ve la pantalla', () => {
    permissions.isSuperAdmin = true;
    renderRoute();
    expect(screen.getByText('Herramientas de la plataforma')).toBeInTheDocument();
  });
});
