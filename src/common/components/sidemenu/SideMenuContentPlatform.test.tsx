import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const orders = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/orders', () => ({
  useOrders: (...args: unknown[]) => orders(...args) as unknown,
}));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: undefined }) }));
const SIGNED = 'https://splg.s3.amazonaws.com/users/me.jpg?X-Amz-Signature=abc';
vi.mock('../../../services/queries/users', () => ({
  useMyAccount: () => ({ data: { user_id: 'u-1', photoUrl: SIGNED } }),
}));
vi.mock('../../../services/queries/photos', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRenewablePhoto: (_kind: string, _id: string, url: string | null | undefined) => ({
    src: url ?? null,
    failed: false,
    handleError: vi.fn(),
  }),
}));
vi.mock('../../../services/queries/queryClient', () => ({ queryClient: { clear: vi.fn() } }));
vi.mock('../../../hooks/reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { email: string; role: string; uid: string } }) => unknown) =>
    pick({ auth: { email: 'superadmin@splg.com', role: 'super_admin', uid: 'uid-sa' } }),
}));
vi.mock('./TenantCard', () => ({ TenantCard: () => null }));
vi.mock('../LogoSplg', () => ({ LogoSplg: () => null }));
vi.mock('../CompanyBrand', () => ({ CompanyBrand: () => null, PoweredByPlatform: () => null }));

import { ownedCompany } from '../../../services/api/ownedCompany';
import { supportMode } from '../../../services/api/supportMode';
import { SideMenuContent } from './SideMenuContent';

const draw = () =>
  render(
    <MemoryRouter>
      <SideMenuContent isSuperAdmin fullName="Sol" onLogout={vi.fn()} />
    </MemoryRouter>,
  );

beforeEach(() => {
  orders.mockReturnValue({ data: undefined });
  supportMode.reset();
  ownedCompany.reset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SideMenuContent: administrador general', () => {
  it('sin sesión de soporte oculta lo de empresa y no pide los pedidos pendientes', () => {
    supportMode.update(null);
    draw();
    expect(screen.queryByRole('link', { name: /^Pedidos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Clientes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hojas de ruta/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Distribuidoras/ })).toBeInTheDocument();
    // Fuera de soporte, sólo la auditoría de la plataforma: la de datos es de empresa.
    expect(screen.getByRole('link', { name: 'Auditoría de plataforma' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Auditoría' })).not.toBeInTheDocument();
    expect(orders).toHaveBeenCalled();
    for (const call of orders.mock.calls as unknown[][]) expect(call[2]).toMatchObject({ enabled: false });
  });

  it('la foto propia sale de «mi cuenta» (no del lote de personas, que es de empresa y daría 403)', () => {
    supportMode.update(null);
    const { container } = draw();
    expect(container.querySelector(`img[src="${SIGNED}"]`)).not.toBeNull();
  });

  it('en modo soporte ve lo de empresa (sin plataforma) y sí cuenta los pendientes', () => {
    supportMode.update({ id: 's-1', status: 'active', scope: [], distributorName: 'Gas Norte' } as never);
    draw();
    expect(screen.getByRole('link', { name: /^Pedidos/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Distribuidoras/ })).not.toBeInTheDocument();
    expect(orders).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: true }),
    );
  });

  it('en la empresa propia ve el menú de empresa (con su auditoría), nada de plataforma, y cuenta los pendientes', () => {
    supportMode.update(null);
    ownedCompany.enter({ id: 'c-own', slug: 'prueba-orixtech', name: 'Distribuidora de prueba' }, 'uid-sa');
    draw();
    expect(screen.getByRole('link', { name: /^Pedidos/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hojas de ruta/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Distribuidoras/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Auditoría de plataforma' })).not.toBeInTheDocument();
    expect(orders).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ enabled: true }),
    );
  });

  it('la empresa propia elegida por otra cuenta no cuenta: sigue en la plataforma', () => {
    supportMode.update(null);
    ownedCompany.enter({ id: 'c-own', slug: 'prueba-orixtech', name: 'Distribuidora de prueba' }, 'uid-otro');
    draw();
    expect(screen.getByRole('link', { name: /Distribuidoras/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Pedidos/ })).not.toBeInTheDocument();
  });
});
