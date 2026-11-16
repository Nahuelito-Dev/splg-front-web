import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({ mode: 'owned' }));
vi.mock('../../hooks', () => ({ usePermissions: () => ({ mode: state.mode }) }));
vi.mock('../../hooks/reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { uid: string } }) => unknown) => pick({ auth: { uid: 'uid-sa' } }),
}));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));
vi.mock('../../services/queries/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

import { ownedCompany } from '../../services/api/ownedCompany';
import { OwnedCompanyBanner } from './OwnedCompanyBanner';

beforeEach(() => {
  state.mode = 'owned';
  ownedCompany.reset();
  ownedCompany.enter({ id: 'c-own', slug: 'prueba-orixtech', name: 'Distribuidora de prueba OrixTech' }, 'uid-sa');
});
afterEach(cleanup);

describe('OwnedCompanyBanner', () => {
  it('dice que se está operando la empresa de prueba de la plataforma', () => {
    renderPage(<OwnedCompanyBanner />, { url: '/orders' });
    expect(screen.getByRole('region', { name: 'Empresa propia' })).toHaveTextContent(
      'Estás operando la empresa de prueba de OrixTech',
    );
  });

  it('«Salir» vuelve a la plataforma y al inicio', () => {
    renderPage(<OwnedCompanyBanner />, { url: '/orders' });
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(ownedCompany.getStored()).toBeNull();
    expect(screen.getByText('otra ruta')).toBeInTheDocument();
  });

  it('fuera de la empresa propia no se muestra', () => {
    state.mode = 'support';
    renderPage(<OwnedCompanyBanner />, { url: '/orders' });
    expect(screen.queryByRole('region', { name: 'Empresa propia' })).not.toBeInTheDocument();
  });
});
