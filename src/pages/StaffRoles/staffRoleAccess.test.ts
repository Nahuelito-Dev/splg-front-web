import { describe, expect, it } from 'vitest';
import type { StaffRole } from '../../services/api/types';
import {
  HAS_ADMINS_HINT,
  OWN_ROLE_HINT,
  SYSTEM_ROLE_DELETE_HINT,
  SYSTEM_ROLE_EDIT_HINT,
  matchesStaffRole,
  staffRoleActions,
} from './staffRoleAccess';

const role = (over: Partial<StaffRole> = {}): StaffRole => ({
  staffRoleId: 'r2',
  name: 'Depósito',
  description: null,
  isSystem: false,
  permissions: ['stock.gestionar'],
  adminCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const viewer = { canManage: true, writeHint: undefined, ownRoleId: 'r1' };

describe('staffRoleActions', () => {
  it('un rol personalizado sin administradores se edita y se da de baja', () => {
    expect(staffRoleActions(role(), viewer)).toEqual({ edit: {}, remove: {} });
  });

  it('el rol de sistema no se edita ni se da de baja', () => {
    expect(staffRoleActions(role({ isSystem: true }), viewer)).toEqual({
      edit: { blockedReason: SYSTEM_ROLE_EDIT_HINT },
      remove: { blockedReason: SYSTEM_ROLE_DELETE_HINT },
    });
  });

  it('nadie edita el rol que tiene asignado', () => {
    expect(staffRoleActions(role(), { ...viewer, ownRoleId: 'r2' }).edit).toEqual({ blockedReason: OWN_ROLE_HINT });
  });

  it('un rol con administradores no se da de baja', () => {
    expect(staffRoleActions(role({ adminCount: 2 }), viewer).remove).toEqual({ blockedReason: HAS_ADMINS_HINT });
  });

  it('en sólo lectura las dos quedan apagadas con el motivo', () => {
    const hint = 'Modo soporte: sólo lectura';
    expect(staffRoleActions(role(), { ...viewer, writeHint: hint })).toEqual({
      edit: { blockedReason: hint },
      remove: { blockedReason: hint },
    });
  });

  it('sin roles.gestionar no se ofrece nada', () => {
    expect(staffRoleActions(role(), { ...viewer, canManage: false })).toEqual({ edit: null, remove: null });
  });
});

describe('matchesStaffRole', () => {
  const cashier = role({ name: 'Cajero', description: 'Cobros y rendición' });

  it('busca por nombre o descripción, sin importar mayúsculas ni tildes', () => {
    expect(matchesStaffRole(cashier, 'CAJ')).toBe(true);
    expect(matchesStaffRole(cashier, 'rendicion')).toBe(true);
    expect(matchesStaffRole(cashier, 'depósito')).toBe(false);
  });

  it('sin término entran todos', () => {
    expect(matchesStaffRole(cashier, '  ')).toBe(true);
  });
});
