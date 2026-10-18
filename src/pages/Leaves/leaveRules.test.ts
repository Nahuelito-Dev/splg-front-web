import { describe, expect, it } from 'vitest';
import { leaveActions, leaveDays, leaveSchema, overlappingLeave } from './leaveRules';

const base = { type: 'vacation' as const, startDate: '2026-12-01', endDate: '2026-12-14', reason: '' };

describe('licencias: reglas del formulario', () => {
  it('cuenta los días corridos con ambos extremos', () => {
    expect(leaveDays('2026-12-01', '2026-12-14')).toBe(14);
    expect(leaveDays('2026-12-01', '2026-12-01')).toBe(1);
    expect(leaveDays('2026-12-14', '2026-12-01')).toBeNull();
    expect(leaveDays('', '2026-12-01')).toBeNull();
  });

  describe('esquema', () => {
    it('acepta un período válido', () => {
      expect(leaveSchema.safeParse(base).success).toBe(true);
      expect(leaveSchema.safeParse({ ...base, endDate: base.startDate }).success).toBe(true);
    });

    it('rechaza un fin anterior al inicio, fechas vacías y un motivo largo', () => {
      const invertido = leaveSchema.safeParse({ ...base, endDate: '2026-11-30' });
      expect(invertido.success ? [] : invertido.error.issues.map((i) => i.message)).toEqual([
        'El fin no puede ser anterior al inicio',
      ]);
      expect(leaveSchema.safeParse({ ...base, startDate: '' }).success).toBe(false);
      expect(leaveSchema.safeParse({ ...base, reason: 'x'.repeat(501) }).success).toBe(false);
    });
  });

  describe('superposición', () => {
    const otras = [
      { leaveId: 'a', status: 'approved' as const, startDate: '2026-12-10', endDate: '2026-12-20' },
      { leaveId: 'b', status: 'rejected' as const, startDate: '2026-12-01', endDate: '2026-12-05' },
      { leaveId: 'c', status: 'cancelled' as const, startDate: '2026-12-01', endDate: '2026-12-05' },
    ];

    it('avisa de la solicitada o aprobada que se pisa, también si sólo se tocan en un día', () => {
      expect(overlappingLeave(otras, '2026-12-01', '2026-12-10')?.leaveId).toBe('a');
      expect(overlappingLeave(otras, '2026-12-20', '2026-12-25')?.leaveId).toBe('a');
    });

    it('no cuenta las rechazadas ni las canceladas, ni las contiguas', () => {
      expect(overlappingLeave(otras, '2026-12-01', '2026-12-05')).toBeNull();
      expect(overlappingLeave(otras, '2026-12-21', '2026-12-25')).toBeNull();
    });

    it('al modificar una licencia no se cuenta a sí misma', () => {
      expect(overlappingLeave(otras, '2026-12-10', '2026-12-12', 'a')).toBeNull();
    });

    it('con un período inválido no avisa nada', () => {
      expect(overlappingLeave(otras, '2026-12-12', '2026-12-10')).toBeNull();
    });
  });

  describe('acciones por estado', () => {
    const hoy = '2026-12-05';
    it('una solicitada se aprueba, rechaza, modifica y cancela', () => {
      expect(leaveActions({ status: 'requested', endDate: '2026-12-14' }, hoy)).toEqual({
        approve: true,
        reject: true,
        edit: true,
        cancel: true,
      });
    });

    it('una aprobada sólo se cancela, y mientras no haya terminado', () => {
      expect(leaveActions({ status: 'approved', endDate: '2026-12-14' }, hoy)).toEqual({
        approve: false,
        reject: false,
        edit: false,
        cancel: true,
      });
      expect(leaveActions({ status: 'approved', endDate: '2026-12-04' }, hoy).cancel).toBe(false);
    });

    it('una rechazada o cancelada no admite nada', () => {
      for (const status of ['rejected', 'cancelled'] as const) {
        expect(Object.values(leaveActions({ status, endDate: '2026-12-31' }, hoy))).toEqual([
          false,
          false,
          false,
          false,
        ]);
      }
    });
  });
});
