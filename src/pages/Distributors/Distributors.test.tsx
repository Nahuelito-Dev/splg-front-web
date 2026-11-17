import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, ok, renderPage } from '../../test/pageTest';
import { companyItem } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({ list: undefined as unknown, params: vi.fn() }));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../common/support/RequestSupportModal', () => ({ RequestSupportModal: () => null }));
vi.mock('../../services/queries/platformConsole', () => ({
  usePlatformCompanies: (params: unknown) => {
    state.params(params);
    return state.list;
  },
}));
const enterOwned = vi.hoisted(() => vi.fn());
vi.mock('../Platform/useEnterOwnedCompany', () => ({ useEnterOwnedCompany: () => enterOwned }));
vi.mock('./useDistributorActions', () => ({
  useDistributorActions: () => ({ toggleStatus: vi.fn(), remove: vi.fn() }),
}));

import { Distributors } from './Distributors';

const page = (items = [companyItem()], total = items.length) => ok({ range: { from: '', to: '' }, items, total });

describeListStates({
  name: 'Distribuidoras',
  url: '/distributors',
  page: <Distributors />,
  setResult: (result) => {
    state.list = result;
  },
  withRow: () => page(),
  withoutRows: () => page([]),
  rowText: 'Distribuidora Demo',
  emptyText: 'Sin empresas',
  loadingLabel: 'Cargando empresas',
});

afterEach(() => {
  cleanup();
  state.params.mockReset();
});

describe('Distribuidoras (plataforma)', () => {
  it('la empresa propia viene primero (orden de la API) y lleva su marca visible', () => {
    state.list = page([
      companyItem({
        id: 'c-own',
        name: 'Distribuidora de prueba OrixTech',
        ownedByPlatform: true,
        metrics: { orders: 0, salesOrders: 0, revenue: 0, activeDrivers: 0, customers: 0 },
      }),
      companyItem(),
    ]);
    renderPage(<Distributors />, { url: '/distributors' });
    const rows = screen.getAllByRole('listitem').filter((li) => li.parentElement?.parentElement?.tagName === 'DIV');
    expect(within(rows[0]).getByText('Distribuidora de prueba OrixTech')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Empresa propia')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('Empresa propia')).not.toBeInTheDocument();
  });

  it('muestra lo que pide atención de cada empresa', () => {
    state.list = page([companyItem({ processAlerts: 2, supportSessionActive: true, supportRequestsPending: 1 })]);
    renderPage(<Distributors />, { url: '/distributors' });
    expect(screen.getByText('2 procesos con alerta')).toBeInTheDocument();
    expect(screen.getByText('Soporte activo')).toBeInTheDocument();
    expect(screen.getByText('1 pedido de soporte')).toBeInTheDocument();
  });

  it('los filtros de la URL viajan a la API: estado, propia, período y página', () => {
    state.list = page();
    renderPage(<Distributors />, {
      url: '/distributors?status=suspended&owned=true&from=2026-10-01&to=2026-10-31&page=2&size=10',
    });
    expect(state.params).toHaveBeenLastCalledWith({
      status: 'suspended',
      ownedByPlatform: true,
      from: '2026-10-01',
      to: '2026-10-31',
      limit: 10,
      offset: 10,
    });
  });

  it('elegir «Sin la propia» pide ownedByPlatform=false y vuelve a la primera página', () => {
    state.list = page();
    renderPage(<Distributors />, { url: '/distributors?page=3' });
    fireEvent.change(screen.getByLabelText('Empresa propia'), { target: { value: 'false' } });
    expect(state.params).toHaveBeenLastCalledWith(expect.objectContaining({ ownedByPlatform: false, offset: 0 }));
    // La opción del select, lo que el select de la barra muestra adentro y el chip del filtro activo.
    expect(screen.getAllByText('Sin la propia')).toHaveLength(3);
  });

  it('con filtros y sin filas, el vacío lo dice', () => {
    state.list = page([]);
    renderPage(<Distributors />, { url: '/distributors?status=suspended' });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('la propia ofrece «Entrar a la empresa»; las demás, «Pedir acceso de soporte»', () => {
    const own = companyItem({ id: 'c-own', name: 'Prueba', slug: 'prueba-orixtech', ownedByPlatform: true });
    state.list = page([own, companyItem()]);
    renderPage(<Distributors />, { url: '/distributors' });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Prueba' }));
    expect(screen.queryByRole('menuitem', { name: 'Pedir acceso de soporte' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Entrar a la empresa' }));
    expect(enterOwned).toHaveBeenCalledWith(own);
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Distribuidora Demo' }));
    expect(screen.getByRole('menuitem', { name: 'Pedir acceso de soporte' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Entrar a la empresa' })).not.toBeInTheDocument();
  });
});
