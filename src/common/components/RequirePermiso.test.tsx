import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ permiso: { allowed: true, known: true } }));
vi.mock('../../hooks', () => ({
  usePermiso: () => state.permiso,
}));

import { RequirePermiso } from './RequirePermiso';

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/sent-notifications']}>
      <Routes>
        <Route element={<RequirePermiso permiso="auditoria.ver" />}>
          <Route path="sent-notifications" element={<p>Pantalla protegida</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  state.permiso = { allowed: true, known: true };
});

describe('RequirePermiso', () => {
  it('con el permiso muestra la pantalla', () => {
    montar();
    expect(screen.getByText('Pantalla protegida')).toBeInTheDocument();
  });

  it('sin el permiso, aun entrando por URL, muestra «Sin permiso» y no la pantalla', () => {
    state.permiso = { allowed: false, known: true };
    montar();
    expect(screen.queryByText('Pantalla protegida')).not.toBeInTheDocument();
    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
  });

  it('mientras no sabe si lo tiene, no muestra la pantalla', () => {
    state.permiso = { allowed: false, known: false };
    montar();
    expect(screen.queryByText('Pantalla protegida')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin permiso')).not.toBeInTheDocument();
  });
});
