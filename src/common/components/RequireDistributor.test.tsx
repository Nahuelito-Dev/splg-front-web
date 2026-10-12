import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireDistributor } from './RequireDistributor';

const permissions = vi.hoisted(() => ({ needsDistributor: true }));
vi.mock('../../hooks', () => ({ usePermissions: () => permissions }));

const renderRoute = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<RequireDistributor />}>
          <Route index element={<p>Contenido del stock</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('RequireDistributor', () => {
  it('sin distribuidora elegida pide elegir una y no muestra la pantalla', () => {
    permissions.needsDistributor = true;
    renderRoute();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(screen.queryByText('Contenido del stock')).not.toBeInTheDocument();
  });

  it('con distribuidora muestra la pantalla', () => {
    permissions.needsDistributor = false;
    renderRoute();
    expect(screen.getByText('Contenido del stock')).toBeInTheDocument();
  });
});
