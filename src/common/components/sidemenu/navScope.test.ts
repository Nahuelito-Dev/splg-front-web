import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS } from './navConfig';
import { isNavItemVisible, type NavViewer } from './navScope';

const visiblePaths = (viewer: NavViewer) =>
  NAV_SECTIONS.flatMap((section) => section.items.filter((item) => isNavItemVisible(item, viewer)).map((i) => i.path));

const PLATFORM: NavViewer = { mode: 'platform', permissions: 'all' };
const SUPPORT: NavViewer = { mode: 'support', permissions: 'all' };
const ADMIN: NavViewer = { mode: 'company', permissions: 'all' };
const OWNED: NavViewer = { mode: 'owned', permissions: 'all' };

describe('menú por alcance', () => {
  it('«Ayuda» (chat con la plataforma y tickets) es del admin de la empresa con soporte.ver', () => {
    expect(visiblePaths({ mode: 'company', permissions: ['soporte.ver'] })).toContain('/support');
    expect(visiblePaths({ mode: 'company', permissions: [] })).not.toContain('/support');
    expect(visiblePaths(SUPPORT)).not.toContain('/support');
    expect(visiblePaths(PLATFORM)).not.toContain('/support');
  });

  it('el administrador general sin sesión ve sólo plataforma y «ambos»: nada de la operación', () => {
    expect(visiblePaths(PLATFORM).sort()).toEqual(
      [
        '/admins',
        '/distributors',
        '/home',
        '/notifications',
        '/platform/activity',
        '/platform/chats',
        '/platform/monitoring',
        '/platform/scheduled-tasks',
        '/platform/service-usage',
        '/platform/support-sessions',
        '/platform/tickets',
        '/system',
        '/users',
      ].sort(),
    );
  });

  it('el menú de plataforma va primero y en el orden del diseño', () => {
    expect(visiblePaths(PLATFORM).slice(0, 10)).toEqual([
      '/home',
      '/distributors',
      '/platform/chats',
      '/platform/tickets',
      '/platform/support-sessions',
      '/platform/monitoring',
      '/platform/scheduled-tasks',
      '/platform/service-usage',
      '/platform/activity',
      '/system',
    ]);
  });

  it('la auditoría de datos es de empresa: la plataforma ve sólo la suya', () => {
    expect(visiblePaths(PLATFORM)).not.toContain('/audit');
    expect(visiblePaths(PLATFORM)).toContain('/platform/activity');
    for (const viewer of [SUPPORT, ADMIN, OWNED]) expect(visiblePaths(viewer)).toContain('/audit');
  });

  it('la empresa propia ve lo mismo que el admin de una empresa y nada de plataforma', () => {
    expect(visiblePaths(OWNED)).toEqual(visiblePaths(ADMIN));
  });

  it('las sesiones de soporte son de la plataforma: ni el admin ni el modo soporte las ven', () => {
    for (const viewer of [SUPPORT, ADMIN, OWNED])
      expect(visiblePaths(viewer)).not.toContain('/platform/support-sessions');
  });

  it('el monitoreo es sólo de la plataforma: ni el admin ni el modo soporte lo ven', () => {
    for (const viewer of [SUPPORT, ADMIN]) {
      const paths = visiblePaths(viewer);
      expect(paths).not.toContain('/platform/monitoring');
      expect(paths).not.toContain('/settings/process-monitor');
      expect(paths).toContain('/settings/scheduled-tasks');
      expect(paths).toContain('/home');
    }
    expect(visiblePaths(PLATFORM)).not.toContain('/settings/scheduled-tasks');
  });

  it('en modo soporte ve las de empresa y «ambos», no las de plataforma ni «Accesos de soporte»', () => {
    const paths = visiblePaths(SUPPORT);
    expect(paths).toEqual(expect.arrayContaining(['/orders', '/customers', '/finance/boxes', '/home', '/audit']));
    expect(paths).not.toContain('/distributors');
    expect(paths).not.toContain('/system');
    expect(paths).not.toContain('/support-access');
  });

  it('el admin de empresa ve «Accesos de soporte» con soporte.ver, y no las de plataforma', () => {
    expect(visiblePaths(ADMIN)).toContain('/support-access');
    expect(visiblePaths(ADMIN)).not.toContain('/distributors');
    expect(visiblePaths({ mode: 'company', permissions: ['soporte.ver'] })).toContain('/support-access');
  });

  it('sin soporte.ver no ve «Accesos de soporte»; sin despacho.gestionar, no ve «Hojas de ruta»', () => {
    const paths = visiblePaths({ mode: 'company', permissions: ['pedidos.ver'] });
    expect(paths).not.toContain('/support-access');
    expect(paths).not.toContain('/route-sheets');
    expect(paths).toContain('/orders');
  });

  it('mientras no se saben los permisos no esconde nada (la API decide)', () => {
    expect(visiblePaths({ mode: 'company', permissions: null })).toEqual(
      expect.arrayContaining(['/support-access', '/route-sheets']),
    );
  });

  it('«Hojas de ruta» es de empresa: en la plataforma no, en modo soporte sí', () => {
    expect(visiblePaths(PLATFORM)).not.toContain('/route-sheets');
    expect(visiblePaths(SUPPORT)).toContain('/route-sheets');
  });

  it('«Direcciones» (todas las direcciones de todos los clientes) ya no está en el menú', () => {
    for (const viewer of [PLATFORM, SUPPORT, ADMIN]) expect(visiblePaths(viewer)).not.toContain('/addresses');
  });
});
