import { describe, expect, it } from 'vitest';
import { companyContextOf } from './companyContext';

describe('companyContextOf', () => {
  it('el admin: su cuenta (su empresa es la del perfil)', () => {
    expect(companyContextOf({ role: 'admin', uid: 'u1', supportId: null, ownedId: null })).toBe('company:u1');
  });
  it('el administrador general: la sesión de soporte, la empresa propia o nada (plataforma)', () => {
    expect(companyContextOf({ role: 'super_admin', uid: 's', supportId: 'ses-1', ownedId: 'd1' })).toBe(
      'support:ses-1',
    );
    expect(companyContextOf({ role: 'super_admin', uid: 's', supportId: null, ownedId: 'd1' })).toBe('owned:d1');
    expect(companyContextOf({ role: 'super_admin', uid: 's', supportId: null, ownedId: null })).toBeNull();
  });
  it('sin sesión, ninguno', () => {
    expect(companyContextOf({ role: 'admin', uid: null, supportId: null, ownedId: null })).toBeNull();
  });
});
