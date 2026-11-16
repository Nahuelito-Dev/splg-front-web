import { describe, expect, it } from 'vitest';
import {
  attendanceCorrectSchema,
  attendanceRegisterSchema,
  durationText,
  isoToLocal,
  localToIso,
  todayLocal,
} from './attendanceRules';

describe('asistencia: reglas del formulario', () => {
  it('convierte entre la hora local del formulario y el instante ISO', () => {
    const iso = '2026-03-02T11:30:00.000Z';
    expect(localToIso(isoToLocal(iso))).toBe(iso);
    expect(localToIso('')).toBeUndefined();
    expect(isoToLocal(null)).toBe('');
    expect(isoToLocal('no es una fecha')).toBe('');
  });

  it('el día de hoy sale de la fecha local, con ceros a la izquierda', () => {
    expect(todayLocal(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05');
  });

  it('muestra la duración en horas y minutos, y nada si sigue abierta', () => {
    expect(durationText(null)).toBeNull();
    expect(durationText(45)).toBe('45 min');
    expect(durationText(480)).toBe('8 h');
    expect(durationText(510)).toBe('8 h 30 min');
  });

  describe('carga manual (CU-189)', () => {
    const base = { employeeId: 'e1', checkInAt: '2026-03-02T08:00', checkOutAt: '' };

    it('acepta una jornada abierta o cerrada', () => {
      expect(attendanceRegisterSchema.safeParse(base).success).toBe(true);
      expect(attendanceRegisterSchema.safeParse({ ...base, checkOutAt: '2026-03-02T16:00' }).success).toBe(true);
    });

    it('exige empleado e ingreso, y un egreso posterior', () => {
      expect(attendanceRegisterSchema.safeParse({ ...base, employeeId: '' }).success).toBe(false);
      expect(attendanceRegisterSchema.safeParse({ ...base, checkInAt: '' }).success).toBe(false);
      const igual = attendanceRegisterSchema.safeParse({ ...base, checkOutAt: base.checkInAt });
      expect(igual.success ? [] : igual.error.issues.map((i) => i.message)).toEqual([
        'El egreso tiene que ser posterior al ingreso',
      ]);
    });
  });

  describe('corrección (CU-313)', () => {
    const base = { checkInAt: '2026-03-02T08:00', checkOutAt: '2026-03-02T16:00', notes: 'Olvidó marcar' };

    it('exige la nota que explica el cambio', () => {
      expect(attendanceCorrectSchema.safeParse(base).success).toBe(true);
      const sinNota = attendanceCorrectSchema.safeParse({ ...base, notes: '   ' });
      expect(sinNota.success ? [] : sinNota.error.issues.map((i) => i.message)).toEqual([
        'Explicá el cambio en una nota',
      ]);
    });

    it('el egreso sigue siendo posterior al ingreso', () => {
      expect(attendanceCorrectSchema.safeParse({ ...base, checkOutAt: '2026-03-02T07:00' }).success).toBe(false);
    });
  });
});

describe('asistencia: nada hacia el futuro', () => {
  it('ni el ingreso ni el egreso pueden ser futuros', () => {
    const base = { employeeId: 'e1', checkInAt: '2026-03-02T08:00', checkOutAt: '' };
    expect(attendanceRegisterSchema.safeParse({ ...base, checkInAt: '2099-01-01T08:00' }).success).toBe(false);
    expect(attendanceRegisterSchema.safeParse({ ...base, checkOutAt: '2099-01-01T16:00' }).success).toBe(false);
    expect(
      attendanceCorrectSchema.safeParse({ checkInAt: '2026-03-02T08:00', checkOutAt: '2099-01-01T16:00', notes: 'x' })
        .success,
    ).toBe(false);
  });
});
