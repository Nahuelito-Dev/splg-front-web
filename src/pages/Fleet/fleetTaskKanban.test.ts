import { describe, expect, it } from 'vitest';
import type { FleetTask } from '../../services/api/types';
import { dropAction, dueText, dueTone, groupByStatus, isOpenTask } from './fleetTaskKanban';

const task = (patch: Partial<FleetTask>): FleetTask => ({
  taskId: 't1',
  planId: 'p1',
  distributorId: 'd1',
  carId: null,
  deliveryId: null,
  employeeId: null,
  details: null,
  status: 'scheduled',
  dueAt: '2026-10-10T00:00:00.000Z',
  dueKm: null,
  scheduledAt: null,
  performedAt: null,
  odometerKm: null,
  cost: null,
  provider: null,
  referenceNumber: null,
  category: null,
  notes: null,
  expirationStatus: 'current',
  daysUntilDue: 9,
  blocks: false,
  ...patch,
});

describe('tablero de tareas de flota', () => {
  it('sólo se puede soltar en Hecha (cerrar) o Cancelada (cancelar) una tarea abierta', () => {
    expect(dropAction(task({}), 'done')).toBe('close');
    expect(dropAction(task({ status: 'overdue' }), 'cancelled')).toBe('cancel');
    expect(dropAction(task({}), 'in_progress')).toBeNull();
    expect(dropAction(task({}), 'scheduled')).toBeNull();
    expect(dropAction(task({ status: 'done' }), 'cancelled')).toBeNull();
    expect(dropAction(task({ status: 'cancelled' }), 'done')).toBeNull();
  });

  it('isOpenTask excluye hechas y canceladas', () => {
    expect(isOpenTask('forecast')).toBe(true);
    expect(isOpenTask('done')).toBe(false);
    expect(isOpenTask('cancelled')).toBe(false);
  });

  it('agrupa por estado', () => {
    const groups = groupByStatus([task({}), task({ taskId: 't2', status: 'done' }), task({ taskId: 't3' })]);
    expect(groups.scheduled).toHaveLength(2);
    expect(groups.done).toHaveLength(1);
    expect(groups.overdue).toHaveLength(0);
  });

  it('el color del vencimiento sigue la vigencia y se apaga al cerrar', () => {
    expect(dueTone(task({ expirationStatus: 'expired' }))).toBe('danger');
    expect(dueTone(task({ expirationStatus: 'due_soon' }))).toBe('warn');
    expect(dueTone(task({ expirationStatus: 'current' }))).toBe('success');
    expect(dueTone(task({ expirationStatus: null }))).toBe('neutral');
    expect(dueTone(task({ status: 'done', expirationStatus: 'expired' }))).toBe('neutral');
  });

  it('el texto del vencimiento cubre vencida, hoy, futura y por km', () => {
    expect(dueText(task({ daysUntilDue: -2 }))).toBe('Venció hace 2 días');
    expect(dueText(task({ daysUntilDue: -1 }))).toBe('Venció hace 1 día');
    expect(dueText(task({ daysUntilDue: 0 }))).toContain('Vence hoy');
    expect(dueText(task({ daysUntilDue: 3 }))).toContain('Vence en 3 días');
    expect(dueText(task({ dueAt: null, dueKm: 80000 }))).toContain('km');
    expect(dueText(task({ dueAt: null, dueKm: null }))).toBe('Sin vencimiento');
  });
});
