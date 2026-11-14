import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const perms = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: perms.data }) }));
vi.mock('../../../services/queries/orders', () => ({ useOrders: () => ({ data: { total: 0 } }) }));
vi.mock('../../../services/queries/users', () => ({ useMyAccount: () => ({ data: undefined }) }));
vi.mock('../../../hooks/reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { email: string; role: string } }) => unknown) =>
    pick({ auth: { email: 'admin@splg.com', role: 'admin' } }),
}));
vi.mock('../LogoSplg', () => ({ LogoSplg: () => null }));
vi.mock('./TenantCard', () => ({ TenantCard: () => null }));

import { SideMenuContent } from './SideMenuContent';

const draw = () =>
  render(
    <MemoryRouter>
      <SideMenuContent isSuperAdmin={false} fullName="Ana" onLogout={vi.fn()} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('SideMenuContent: permisos', () => {
  it('sin «despacho.gestionar» no muestra «Hojas de ruta»; el resto sigue', () => {
    perms.data = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['pedidos.ver'] };
    draw();
    expect(screen.queryByRole('link', { name: /Hojas de ruta/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Recorridos/ })).toBeInTheDocument();
  });

  it('con el permiso, o mientras no se saben los permisos, lo muestra', () => {
    perms.data = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['despacho.gestionar'] };
    draw();
    expect(screen.getByRole('link', { name: /Hojas de ruta/ })).toBeInTheDocument();
    cleanup();
    perms.data = undefined;
    draw();
    expect(screen.getByRole('link', { name: /Hojas de ruta/ })).toBeInTheDocument();
  });
});
