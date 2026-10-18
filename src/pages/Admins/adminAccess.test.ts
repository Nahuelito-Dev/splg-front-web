import { describe, expect, it } from 'vitest';
import type { Admin } from '../../services/api/types';
import { manageStateOf } from './adminAccess';

const admin = (role: string, email = 'otro@splg.com'): Admin =>
  ({ admin_id: 'a1', user_id: 'u1', user: { email, role: { type: role } } }) as unknown as Admin;

const viewer = (over: Partial<Parameters<typeof manageStateOf>[1]> = {}) => ({
  isSuperAdmin: false,
  needsDistributor: false,
  email: 'yo@splg.com',
  ...over,
});
const general = (needsDistributor: boolean) => viewer({ isSuperAdmin: true, needsDistributor });

describe('manageStateOf', () => {
  it('un admin de empresa gestiona a otro admin', () => {
    expect(manageStateOf(admin('admin'), viewer())).toEqual({ edit: 'allowed', remove: 'allowed' });
  });

  it('un admin de empresa no se gestiona a sí mismo, sin importar mayúsculas', () => {
    expect(manageStateOf(admin('admin', 'YO@splg.com'), viewer())).toEqual({ edit: 'hidden', remove: 'hidden' });
  });

  it('un admin de empresa no toca a un super admin', () => {
    expect(manageStateOf(admin('super_admin'), viewer())).toEqual({ edit: 'hidden', remove: 'hidden' });
  });

  it('el administrador general se edita a sí mismo, pero nunca se da de baja', () => {
    expect(manageStateOf(admin('super_admin', 'yo@splg.com'), general(true))).toEqual({
      edit: 'allowed',
      remove: 'hidden',
    });
  });

  it('el administrador general necesita empresa para un admin de empresa: editar y baja bloqueados con el mismo aviso', () => {
    expect(manageStateOf(admin('admin'), general(true))).toEqual({
      edit: 'needs-distributor',
      remove: 'needs-distributor',
    });
    expect(manageStateOf(admin('admin'), general(false))).toEqual({ edit: 'allowed', remove: 'allowed' });
  });

  it('con una empresa elegida la API no encuentra a un super admin: ni a otro ni a uno mismo', () => {
    expect(manageStateOf(admin('super_admin'), general(false))).toEqual({ edit: 'hidden', remove: 'hidden' });
    expect(manageStateOf(admin('super_admin', 'yo@splg.com'), general(false))).toEqual({
      edit: 'hidden',
      remove: 'hidden',
    });
  });

  it('sin empresa elegida, otro super admin se gestiona', () => {
    expect(manageStateOf(admin('super_admin'), general(true))).toEqual({ edit: 'allowed', remove: 'allowed' });
  });
});
