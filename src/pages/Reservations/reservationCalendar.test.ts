import { describe, expect, it } from 'vitest';
import type { Reserva } from '../../services/api/types';
import {
  calendarTitle,
  dayKey,
  filterReservations,
  groupByDay,
  monthGrid,
  parseDay,
  shiftAnchor,
  weekDays,
} from './reservationCalendar';

const reserva = (patch: Partial<Reserva>): Reserva => ({
  id: 'aaaaaaaa-0000-0000-0000-000000abc123',
  customerName: 'Ana Pérez',
  customerPhone: '3764111222',
  scheduledDate: '2026-10-07',
  paymentMethod: 'cash',
  total: 22600,
  depositAmount: 5000,
  depositPaid: false,
  remainingBalance: 17600,
  paymentUrl: null,
  timeSlot: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  items: [],
  ...patch,
});

describe('calendario de reservas', () => {
  it('parseDay no corre el día por la zona horaria', () => {
    expect(dayKey(parseDay('2026-10-01'))).toBe('2026-10-01');
  });

  it('la semana va de lunes a domingo', () => {
    const days = weekDays(parseDay('2026-10-07'));
    expect(days.map(dayKey)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('el mes cubre semanas completas y arranca en lunes', () => {
    const grid = monthGrid(parseDay('2026-10-15'));
    expect(grid.length % 7).toBe(0);
    expect(grid[0].getDay()).toBe(1);
    expect(grid.map(dayKey)).toContain('2026-10-01');
    expect(grid.map(dayKey)).toContain('2026-10-31');
  });

  it('shiftAnchor mueve un mes, una semana o un día', () => {
    const anchor = parseDay('2026-10-31');
    expect(dayKey(shiftAnchor(anchor, 'day', 1))).toBe('2026-11-01');
    expect(dayKey(shiftAnchor(anchor, 'week', -1))).toBe('2026-10-24');
    expect(dayKey(shiftAnchor(anchor, 'month', 1))).toBe('2026-11-01');
  });

  it('el título depende de la vista', () => {
    expect(calendarTitle(parseDay('2026-10-07'), 'month')).toBe('Octubre de 2026');
    expect(calendarTitle(parseDay('2026-10-07'), 'week')).toContain('2026');
  });

  it('filtra por seña y por texto', () => {
    const rows = [
      reserva({ id: 'x1', customerName: 'Ana Pérez', depositPaid: true }),
      reserva({ id: 'x2', customerName: 'Bruno Díaz', customerPhone: null }),
    ];
    expect(filterReservations(rows, { deposit: 'paid', term: '' })).toHaveLength(1);
    expect(filterReservations(rows, { deposit: 'pending', term: '' })[0].id).toBe('x2');
    expect(filterReservations(rows, { deposit: '', term: ' bruno ' })).toHaveLength(1);
    expect(filterReservations(rows, { deposit: '', term: '3764' })).toHaveLength(1);
    expect(filterReservations(rows, { deposit: '', term: '' })).toHaveLength(2);
  });

  it('agrupa por día y deja afuera las que no tienen fecha', () => {
    const byDay = groupByDay([
      reserva({ id: 'a' }),
      reserva({ id: 'b' }),
      reserva({ id: 'c', scheduledDate: '2026-10-08' }),
      reserva({ id: 'd', scheduledDate: null }),
    ]);
    expect(byDay.get('2026-10-07')).toHaveLength(2);
    expect(byDay.get('2026-10-08')).toHaveLength(1);
    expect(byDay.size).toBe(2);
  });
});
