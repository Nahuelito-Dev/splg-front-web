import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../test/pageTest';
import { overview } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({ overview: undefined as unknown, params: vi.fn() }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSupportSession: () => ({ pending: null, session: null }),
}));
vi.mock('../../common/support/RequestSupportButton', () => ({ RequestSupportButton: () => null }));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'SPLG' } }) }));
vi.mock('../../services/queries/platformConsole', () => ({
  usePlatformOverview: (params: unknown) => {
    state.params(params);
    return state.overview;
  },
}));

import { PlatformHome } from './PlatformHome';

afterEach(() => {
  cleanup();
  state.params.mockReset();
});

describe('PlatformHome (tablero de plataforma)', () => {
  it('muestra los números tal cual los da la API', () => {
    state.overview = ok(overview());
    renderPage(<PlatformHome />, { url: '/home' });
    expect(screen.getByText('3 activas · 0 suspendidas')).toBeInTheDocument();
    expect(screen.getByText('155')).toBeInTheDocument();
    expect(screen.getByText(/1\.143\.120/)).toBeInTheDocument();
    expect(screen.getByText('14 lecturas · noviembre de 2026')).toBeInTheDocument();
    expect(screen.getByText(/Período: 1 nov 2026 al 14 nov 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Alertas de la plataforma' })).not.toBeInTheDocument();
  });

  it('las alertas de procesos y de soporte llevan a su pantalla', () => {
    state.overview = ok(
      overview({ processes: { alerts: 2, failuresLast24h: 1 }, supportSessions: { active: 1, pending: 1 } }),
    );
    renderPage(<PlatformHome />, { url: '/home' });
    expect(screen.getByRole('link', { name: /2 procesos automáticos/ })).toHaveAttribute(
      'href',
      '/platform/monitoring',
    );
    expect(screen.getByRole('link', { name: /1 corrida fallida/ })).toHaveAttribute('href', '/platform/monitoring');
    expect(screen.getByRole('link', { name: /1 pedido de acceso de soporte/ })).toHaveAttribute(
      'href',
      '/distributors',
    );
  });

  it('el período de la URL viaja a la API', () => {
    state.overview = ok(overview());
    renderPage(<PlatformHome />, { url: '/home?from=2026-10-01&to=2026-10-31' });
    expect(state.params).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('mientras carga muestra la carga de pantalla entera', () => {
    state.overview = loading();
    renderPage(<PlatformHome />, { url: '/home' });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el tablero…');
  });

  it('un error se dice y permite reintentar', () => {
    const refetch = vi.fn();
    state.overview = failed(refetch);
    renderPage(<PlatformHome />, { url: '/home' });
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
