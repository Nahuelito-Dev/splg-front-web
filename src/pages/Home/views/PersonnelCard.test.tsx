import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ dashboard: vi.fn(), needsDistributor: false }));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: state.needsDistributor }),
}));
vi.mock('../../../services/queries/personnel', () => ({
  usePersonnelDashboard: (...args: unknown[]) => state.dashboard(...args) as unknown,
}));

import { PersonnelCard } from './PersonnelCard';

const draw = () =>
  render(
    <MemoryRouter>
      <PersonnelCard />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.needsDistributor = false;
});

describe('PersonnelCard: «Personal hoy» (CU-194)', () => {
  it('muestra presentes, de licencia y documentos, cada uno con su pantalla', () => {
    state.dashboard.mockReturnValue(
      ok({
        totalActive: 8,
        presentToday: 5,
        onLeaveToday: 1,
        documents: { current: 10, dueSoon: 3, expired: 2 },
      }),
    );
    draw();
    expect(screen.getByText('8 empleados activos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Presentes/ })).toHaveAttribute('href', '/attendance');
    expect(screen.getByRole('link', { name: /De licencia/ })).toHaveAttribute('href', '/leaves?status=approved');
    expect(screen.getByRole('link', { name: /Documentos vencidos/ })).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: /Documentos por vencer/ })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /Documentos por vencer/ })).toHaveAttribute(
      'href',
      '/fleet/expirations?subject=employee',
    );
  });

  it('con todo en cero muestra ceros, no un vacío', () => {
    state.dashboard.mockReturnValue(
      ok({ totalActive: 0, presentToday: 0, onLeaveToday: 0, documents: { current: 0, dueSoon: 0, expired: 0 } }),
    );
    draw();
    expect(screen.getByText('0 empleados activos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Presentes/ })).toHaveTextContent('0');
  });

  it('un error del back se dice; mientras carga no inventa cifras', () => {
    state.dashboard.mockReturnValue(failed());
    draw();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el personal');
    cleanup();
    state.dashboard.mockReturnValue(loading());
    draw();
    expect(screen.queryByRole('link', { name: /Presentes/ })).not.toBeInTheDocument();
  });

  it('un administrador general sin «Ver como» no ve la tarjeta ni consulta', () => {
    state.needsDistributor = true;
    state.dashboard.mockReturnValue(ok(undefined));
    const { container } = draw();
    expect(container).toBeEmptyDOMElement();
    expect(state.dashboard).toHaveBeenCalledWith(false);
  });
});
