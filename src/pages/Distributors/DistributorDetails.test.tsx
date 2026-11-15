import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { failed, loading, mutation, ok, renderPage } from '../../test/pageTest';
import { companyDetail } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({
  detail: undefined as unknown,
  setOwned: undefined as unknown,
  confirmed: true,
  isSuperAdmin: true,
  params: vi.fn(),
}));
vi.mock('../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  AuditHistoryLink: () => null,
}));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../common/support/RequestSupportButton', () => ({ RequestSupportButton: () => null }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ isSuperAdmin: state.isSuperAdmin }),
  useBackToList: () => () => undefined,
}));
// La ficha de plataforma no pide `GET /distributor/:id` (v1, trae el teléfono): si lo pidiera, esto lo registra.
const v1Distributor = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/distributors', () => ({ getDistributor: v1Distributor, listDistributors: v1Distributor }));
vi.mock('../../services/queries/distributors', () => ({
  useDistributor: (...args: unknown[]) => {
    v1Distributor(...args);
    return { data: undefined };
  },
}));
const enterOwned = vi.hoisted(() => vi.fn());
vi.mock('../Platform/useEnterOwnedCompany', () => ({ useEnterOwnedCompany: () => enterOwned }));
vi.mock('../../services/queries/platformConsole', () => ({
  usePlatformCompany: (id: unknown, params: unknown) => {
    state.params(id, params);
    return state.detail;
  },
  useSetCompanyOwnedByPlatform: () => state.setOwned,
}));
vi.mock('../Platform/Modules/CompanyModulesList', () => ({
  CompanyModulesList: ({ companyId, companyName }: { companyId: string; companyName: string }) => (
    <p>
      Módulos de {companyName} ({companyId})
    </p>
  ),
}));
vi.mock('./useDistributorActions', () => ({
  useDistributorActions: () => ({ toggleStatus: vi.fn(), remove: vi.fn() }),
}));
vi.mock('../../utils/notifications', () => ({
  confirm: vi.fn(() => Promise.resolve(state.confirmed)),
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { confirm } from '../../utils/notifications';
import { DistributorDetails } from './DistributorDetails';

const render = (url = '/distributors/c-gas') => renderPage(<DistributorDetails />, { url, path: '/distributors/:id' });
const openMenuItem = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
  fireEvent.click(screen.getByRole('menuitem', { name }));
};
const setOwned = () => state.setOwned as ReturnType<typeof mutation>;

beforeEach(() => {
  state.detail = ok(companyDetail());
  state.setOwned = mutation();
  state.confirmed = true;
  state.isSuperAdmin = true;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Ficha de la empresa (plataforma)', () => {
  it('pide la ficha con su id y el período de la URL', () => {
    render('/distributors/c-gas?from=2026-10-01&to=2026-10-31');
    expect(state.params).toHaveBeenCalledWith('c-gas', { from: '2026-10-01', to: '2026-10-31' });
  });

  it('Datos: lo que trae el endpoint, sin teléfono ni banco, y nunca pide la empresa a la v1', () => {
    render();
    expect(v1Distributor).not.toHaveBeenCalled();
    expect(screen.queryByText('Logo')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Nahuel Gas' })).toBeInTheDocument();
    expect(screen.getByText('contacto@gasandino.com')).toBeInTheDocument();
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument();
    expect(screen.queryByText('Empresa propia', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('«Plan y módulos» muestra los módulos de la empresa y se puede abrir directo por la URL', () => {
    render();
    fireEvent.click(screen.getByRole('tab', { name: 'Plan y módulos' }));
    expect(screen.getByText('Módulos de Nahuel Gas (c-gas)')).toBeInTheDocument();
    cleanup();
    render('/distributors/c-gas?tab=modules');
    expect(screen.getByText('Módulos de Nahuel Gas (c-gas)')).toBeInTheDocument();
  });

  it('Uso, Admins y Soporte muestran cada parte de la ficha', () => {
    render();
    fireEvent.click(screen.getByRole('tab', { name: /Uso/ }));
    expect(screen.getByText('Aviso de vencimientos de flota')).toBeInTheDocument();
    expect(screen.getByText(/2 fallas en 24 h/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Monitoreo' })).toHaveAttribute(
      'href',
      '/platform/monitoring?company=c-gas',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Admins/ }));
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Nunca ingresó')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Soporte/ }));
    expect(screen.getByText('Revisar un pedido trabado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
      'href',
      '/platform/support-sessions?company=c-gas',
    );
  });

  it('marcar como propia pide confirmación y manda ownedByPlatform=true', async () => {
    render();
    openMenuItem('Marcar como empresa propia');
    await waitFor(() => expect(setOwned().mutate).toHaveBeenCalled());
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: 'Marcar como propia' }));
    expect(setOwned().mutate.mock.calls[0]?.[0]).toEqual({ id: 'c-gas', ownedByPlatform: true });
  });

  it('el 409 COMPANY_NOT_PLATFORM_OWNED se muestra con el mensaje de la API', async () => {
    render();
    openMenuItem('Marcar como empresa propia');
    await waitFor(() => expect(setOwned().mutate).toHaveBeenCalled());
    const options = setOwned().mutate.mock.calls[0]?.[1] as { onError: (e: unknown) => void };
    act(() =>
      options.onError(
        new ApiError(
          409,
          ['Sólo se puede marcar como propia una empresa de prueba creada por la plataforma'],
          'COMPANY_NOT_PLATFORM_OWNED',
        ),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sólo se puede marcar como propia una empresa de prueba creada por la plataforma',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si no se confirma, no manda nada', async () => {
    state.confirmed = false;
    render();
    openMenuItem('Marcar como empresa propia');
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(setOwned().mutate).not.toHaveBeenCalled();
  });

  it('a la propia se entra directo; a otra, sólo con acceso de soporte', () => {
    render();
    expect(screen.queryByRole('button', { name: 'Entrar a la empresa' })).not.toBeInTheDocument();
    cleanup();
    state.detail = ok(companyDetail({ ownedByPlatform: true, slug: 'prueba-orixtech', name: 'Prueba' }));
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la empresa' }));
    expect(enterOwned).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-gas', slug: 'prueba-orixtech' }));
  });

  it('la propia muestra su marca y se puede desmarcar', async () => {
    state.detail = ok(companyDetail({ ownedByPlatform: true }));
    render();
    expect(screen.getByText('Empresa propia', { selector: 'span' })).toBeInTheDocument();
    openMenuItem('Desmarcar como empresa propia');
    await waitFor(() => expect(setOwned().mutate).toHaveBeenCalled());
    expect(setOwned().mutate.mock.calls[0]?.[0]).toEqual({ id: 'c-gas', ownedByPlatform: false });
  });

  it('mientras carga muestra la carga de pantalla entera; un 404, que no existe', () => {
    state.detail = loading();
    render();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la empresa…');
    cleanup();
    state.detail = { ...failed(), error: new ApiError(404, ['No existe'], 'COMPANY_NOT_FOUND') };
    render();
    expect(screen.getByText('La empresa no existe')).toBeInTheDocument();
  });

  it('quien no es administrador general no la ve ni la pide', () => {
    state.isSuperAdmin = false;
    render();
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
    expect(state.params).toHaveBeenCalledWith(undefined, expect.anything());
  });
});
