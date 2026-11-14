import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, ok, renderPage } from '../../test/pageTest';
import { companyItem } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({ activity: undefined as unknown, params: vi.fn() }));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/platformConsole', () => ({
  useAllPlatformCompanies: () => ({
    companies: [companyItem({ id: 'c1', name: 'Nahuel Gas' })],
    total: 2,
    loading: false,
    error: null,
  }),
  usePlatformActivity: (params: unknown) => {
    state.params(params);
    return state.activity;
  },
}));

const accounts = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/users', () => ({
  usePlatformAccounts: (term: string, options: unknown) => accounts(term, options) as unknown,
}));

import { PlatformActivity } from './PlatformActivity';

const item = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  at: '2026-11-14T16:48:00.000Z',
  kind: 'request',
  actorUserId: 'u1',
  actorName: 'Nahuel Wagner',
  actorRole: 'super_admin',
  method: 'PUT',
  resource: 'platform',
  resourceId: 'c1',
  path: '/api/v2/platform/companies/:id/owned-by-platform',
  distributorId: 'c1',
  distributorName: 'Nahuel Gas',
  result: 'failure',
  statusCode: 409,
  ...over,
});
const list = (items = [item()]) => ok({ items, total: items.length });

describeListStates({
  name: 'Auditoría de plataforma',
  url: '/platform/activity',
  page: <PlatformActivity />,
  setResult: (result) => {
    state.activity = result;
  },
  withRow: () => list(),
  withoutRows: () => list([]),
  rowText: 'Marcó o desmarcó la empresa propia',
  emptyText: 'Sin actividad',
  loadingLabel: 'Cargando registros',
});

beforeEach(() => {
  state.activity = list();
  accounts.mockReturnValue({ accounts: [], loading: false, error: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Auditoría de plataforma', () => {
  it('muestra quién, qué (en castellano, sin la ruta de la API), empresa y resultado', () => {
    renderPage(<PlatformActivity />, { url: '/platform/activity' });
    expect(screen.getByText('Marcó o desmarcó la empresa propia')).toBeInTheDocument();
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
    expect(screen.queryByText(/\/api\//)).not.toBeInTheDocument();
    expect(screen.queryByText(/PUT/)).not.toBeInTheDocument();
    expect(screen.getByText('Nahuel Wagner')).toBeInTheDocument();
    expect(screen.getByText('Fallida')).toBeInTheDocument();
    expect(screen.getByText('409')).toBeInTheDocument();
    expect(screen.getByText(/· Nahuel Gas/)).toBeInTheDocument();
  });

  it('un ingreso al panel se lee como tal', () => {
    state.activity = list([item({ kind: 'login', method: null, path: null, resource: 'auth' })]);
    renderPage(<PlatformActivity />, { url: '/platform/activity' });
    expect(screen.getByText('Ingresó al panel')).toBeInTheDocument();
  });

  it('los filtros de la URL viajan a la API', () => {
    renderPage(<PlatformActivity />, {
      url: '/platform/activity?from=2026-11-01&to=2026-11-14&company=c1&page=2&size=10',
    });
    expect(state.params).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-14',
      distributorId: 'c1',
      actorUserId: '',
      limit: 10,
      offset: 10,
    });
  });

  it('la persona se elige en un selector de cuentas de la plataforma, no con un id a mano', async () => {
    const ana = {
      user_id: 'u-ana',
      full_name: 'Ana Plataforma',
      email: 'ana@orixtech.com',
      role: { type: 'super_admin' },
    };
    accounts.mockReturnValue({ accounts: [ana], loading: false, error: null });
    renderPage(<PlatformActivity />, { url: '/platform/activity' });
    expect(screen.queryByPlaceholderText('UUID')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quién'), { target: { value: 'ana' } });
    await waitFor(() => expect(accounts).toHaveBeenLastCalledWith('ana', { enabled: true }));
    fireEvent.click(screen.getByRole('button', { name: /Ana Plataforma/ }));
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ actorUserId: 'u-ana', offset: 0 }));
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('Ana Plataforma');
  });

  it('con filtros y sin filas dice que nada cumple', () => {
    state.activity = list([]);
    renderPage(<PlatformActivity />, { url: '/platform/activity?company=c1' });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});
