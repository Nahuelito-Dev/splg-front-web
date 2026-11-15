import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const perms = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('../../../features/chat/components/InboxNavBadge', () => ({ InboxNavBadge: () => null }));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: perms.data }) }));
const mods = vi.hoisted(() => ({ enabledByKey: null as Record<string, boolean> | null }));
vi.mock('../../../services/queries/modules', () => ({
  useModuleAvailability: () => ({ enabledByKey: mods.enabledByKey, loading: false }),
}));
vi.mock('../../../services/queries/orders', () => ({ useOrders: () => ({ data: { total: 0 } }) }));
vi.mock('../../../services/queries/users', () => ({ useMyAccount: () => ({ data: undefined }) }));
vi.mock('../../../hooks/reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { email: string; role: string } }) => unknown) =>
    pick({ auth: { email: 'admin@splg.com', role: 'admin' } }),
}));
vi.mock('../LogoSplg', () => ({ LogoSplg: () => null }));
vi.mock('../CompanyBrand', () => ({ CompanyBrand: () => null, PoweredByPlatform: () => null }));
vi.mock('./TenantCard', () => ({ TenantCard: () => null }));
// La insignia del chat con la plataforma lee su contador con React Query: se prueba aparte.
vi.mock('../../../features/chat/components/SupportNavBadge', () => ({ SupportNavBadge: () => null }));

import { SideMenuContent } from './SideMenuContent';

const draw = () =>
  render(
    <MemoryRouter>
      <SideMenuContent isSuperAdmin={false} fullName="Ana" onLogout={vi.fn()} />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  mods.enabledByKey = null;
});

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

describe('SideMenuContent: módulos de la plataforma', () => {
  it('un módulo que la plataforma no le habilitó a la empresa no aparece; los habilitados y el núcleo sí', () => {
    perms.data = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    mods.enabledByKey = { document_reading: false, repurchase: true, route_planning: false };
    draw();
    expect(screen.queryByRole('link', { name: /Lectura de documentos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hojas de ruta/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Recompra/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pedidos/ })).toBeInTheDocument();
  });

  it('mientras no se saben los módulos no esconde nada', () => {
    perms.data = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    mods.enabledByKey = null;
    draw();
    expect(screen.getByRole('link', { name: /Lectura de documentos/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hojas de ruta/ })).toBeInTheDocument();
  });

  it('al habilitarse de nuevo, el ítem vuelve sin recargar', () => {
    perms.data = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    mods.enabledByKey = { document_reading: false };
    const { rerender } = draw();
    expect(screen.queryByRole('link', { name: /Lectura de documentos/ })).not.toBeInTheDocument();
    mods.enabledByKey = { document_reading: true };
    rerender(
      <MemoryRouter>
        <SideMenuContent isSuperAdmin={false} fullName="Ana" onLogout={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Lectura de documentos/ })).toBeInTheDocument();
  });
});

describe('SideMenuContent: asistente del chat (M8)', () => {
  it('con el módulo apagado, «Asistente del chat» no aparece', () => {
    perms.data = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    mods.enabledByKey = { assistant: false };
    draw();
    expect(screen.queryByRole('link', { name: /Asistente del chat/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Procesos automáticos/ })).toBeInTheDocument();
  });

  it('habilitado aparece, pero sólo con «asistente.ver»', () => {
    mods.enabledByKey = { assistant: true };
    perms.data = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['asistente.ver'] };
    draw();
    expect(screen.getByRole('link', { name: /Asistente del chat/ })).toHaveAttribute('href', '/settings/assistant');
    cleanup();
    perms.data = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['pedidos.ver'] };
    draw();
    expect(screen.queryByRole('link', { name: /Asistente del chat/ })).not.toBeInTheDocument();
  });
});
