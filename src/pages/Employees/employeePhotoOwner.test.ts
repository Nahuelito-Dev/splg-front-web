import { describe, expect, it } from 'vitest';
import { employeePhotoOwner } from './employeePhotoOwner';

describe('employeePhotoOwner', () => {
  it('con cuenta de acceso la foto es la del usuario', () => {
    expect(employeePhotoOwner({ employeeId: 'e-1', hasAccount: true, userId: 'u-1' })).toEqual({
      kind: 'user',
      id: 'u-1',
    });
  });
  it('sin cuenta es la del legajo', () => {
    expect(employeePhotoOwner({ employeeId: 'e-1', hasAccount: false, userId: null })).toEqual({
      kind: 'employee',
      id: 'e-1',
    });
  });
});
