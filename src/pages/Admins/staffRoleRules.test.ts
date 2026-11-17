import { describe, expect, it } from 'vitest';
import type { Admin, MyPermissions, StaffRole } from '../../services/api/types';
import { TARGET_IS_SYSTEM_HINT, TARGET_OUTRANKS_HINT, targetOutranksReason } from './staffRoleRules';

const role = (over: Partial<StaffRole> = {}): StaffRole => ({
  staffRoleId: 'r2',
  name: 'Depósito',
  description: null,
  isSystem: false,
  permissions: ['stock.gestionar'],
  adminCount: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const target = (staffRole: { staffRoleId: string; name: string; isSystem: boolean } | null) =>
  ({ admin_id: 'a2', staffRole }) as unknown as Admin;
const mine = (permissions: string[], allPermissions = false): MyPermissions => ({
  role: 'admin',
  allPermissions,
  staffRole: null,
  permissions,
});
const deposito = target({ staffRoleId: 'r2', name: 'Depósito', isSystem: false });
const sistema = target({ staffRoleId: 'r1', name: 'Administrador', isSystem: true });

describe('targetOutranksReason', () => {
  it('su rol actual tiene permisos que la sesión no tiene', () => {
    expect(targetOutranksReason(deposito, [role()], mine(['stock.ver']))).toBe(TARGET_OUTRANKS_HINT);
  });

  it('con todos los permisos de su rol actual, se puede', () => {
    expect(targetOutranksReason(deposito, [role()], mine(['stock.ver', 'stock.gestionar']))).toBeUndefined();
  });

  it('el de sistema pide tener todos los permisos', () => {
    expect(targetOutranksReason(sistema, [], mine(['stock.gestionar']))).toBe(TARGET_IS_SYSTEM_HINT);
    expect(targetOutranksReason(sistema, [], mine([], true))).toBeUndefined();
  });

  it('sin rol actual, o sin saber todavía los permisos, no se apaga', () => {
    expect(targetOutranksReason(target(null), [role()], mine([]))).toBeUndefined();
    expect(targetOutranksReason(deposito, undefined, mine([]))).toBeUndefined();
    expect(targetOutranksReason(deposito, [role()], undefined)).toBeUndefined();
  });
});
