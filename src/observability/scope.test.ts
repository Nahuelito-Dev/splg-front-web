import { afterEach, describe, expect, it, vi } from 'vitest';

const setUser = vi.hoisted(() => vi.fn());
const setTags = vi.hoisted(() => vi.fn());
vi.mock('@sentry/react', () => ({ setUser, setTags }));

const { applySentryScope } = await import('./scope');

afterEach(() => {
  setUser.mockReset();
  setTags.mockReset();
});

describe('usuario y empresa en Sentry', () => {
  it('admin de empresa: sólo el id interno, rol y el id de la empresa (un solo tag)', () => {
    applySentryScope({ userId: 'u-1', role: 'admin', mode: 'company', distributorId: 'd-1' });
    expect(setUser).toHaveBeenCalledWith({ id: 'u-1' });
    expect(setTags).toHaveBeenCalledWith({ role: 'admin', panel_mode: 'company', distributor: 'd-1' });
  });

  it('administrador general en la plataforma: sin empresa', () => {
    applySentryScope({ userId: 'u-2', role: 'super_admin', mode: 'platform', distributorId: null });
    expect(setTags).toHaveBeenCalledWith({ role: 'super_admin', panel_mode: 'platform', distributor: 'platform' });
  });

  it('al cerrar sesión se limpia el usuario y los tags', () => {
    applySentryScope({ userId: null, role: null, mode: null, distributorId: null });
    expect(setUser).toHaveBeenCalledWith(null);
    expect(setTags).toHaveBeenCalledWith({ role: undefined, panel_mode: undefined, distributor: undefined });
  });
});
