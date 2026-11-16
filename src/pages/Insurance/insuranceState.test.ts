import { describe, expect, it } from 'vitest';
import { daysBetween, installmentLabel, previewInstallments } from './insuranceState';

const TODAY = '2026-10-28';
const pending = (dueDate: string, graceUntil: string) => ({ status: 'pending' as const, dueDate, graceUntil });

describe('installmentLabel', () => {
  it('paga y cancelada salen de su estado', () => {
    expect(installmentLabel({ status: 'paid', dueDate: '2026-01-01', graceUntil: '2026-01-06' }, TODAY).text).toBe(
      'Paga',
    );
    expect(installmentLabel({ status: 'cancelled', dueDate: '2026-01-01', graceUntil: '2026-01-06' }, TODAY).tone).toBe(
      'neutral',
    );
  });

  it('pasada la gracia es peligro; dentro de la gracia, aviso', () => {
    expect(installmentLabel(pending('2026-10-20', '2026-10-25'), TODAY)).toEqual({ text: 'Vencida', tone: 'danger' });
    expect(installmentLabel(pending('2026-10-26', '2026-10-31'), TODAY)).toEqual({ text: 'En gracia', tone: 'warn' });
    expect(installmentLabel(pending('2026-10-23', '2026-10-28'), TODAY).text).toBe('En gracia');
  });

  it('por vencer en 5 días o menos avisa; más lejos es pendiente', () => {
    expect(installmentLabel(pending('2026-11-02', '2026-11-07'), TODAY)).toEqual({
      text: 'Vence en 5 días',
      tone: 'warn',
    });
    expect(installmentLabel(pending('2026-10-28', '2026-11-02'), TODAY).text).toBe('Vence hoy');
    expect(installmentLabel(pending('2026-10-29', '2026-11-03'), TODAY).text).toBe('Vence mañana');
    expect(installmentLabel(pending('2026-11-03', '2026-11-08'), TODAY)).toEqual({
      text: 'Pendiente',
      tone: 'neutral',
    });
  });
});

describe('daysBetween', () => {
  it('cuenta días de calendario', () => {
    expect(daysBetween('2026-10-28', '2026-11-02')).toBe(5);
    expect(daysBetween('2026-11-02', '2026-10-28')).toBe(-5);
  });
});

describe('previewInstallments', () => {
  it('arma las cuotas mensuales con su gracia', () => {
    const rows = previewInstallments({ count: 3, amount: 1000, firstDueDate: '2026-11-10', graceDays: 5 });
    expect(rows.map((r) => [r.label, r.dueDate, r.graceUntil])).toEqual([
      ['1/3', '2026-11-10', '2026-11-15'],
      ['2/3', '2026-12-10', '2026-12-15'],
      ['3/3', '2027-01-10', '2027-01-15'],
    ]);
  });

  it('conserva el día original y cae al último del mes que no lo tiene', () => {
    const rows = previewInstallments({ count: 4, amount: 10, firstDueDate: '2027-01-31', graceDays: 0 });
    expect(rows.map((r) => r.dueDate)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });
});
