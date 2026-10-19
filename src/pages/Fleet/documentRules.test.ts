import { describe, expect, it } from 'vitest';
import type { FleetTask } from '../../services/api/types';
import { documentDueText, documentsToReview } from './documentRules';

const task = (id: string, fields: Partial<FleetTask>): FleetTask =>
  ({ taskId: id, status: 'scheduled', expirationStatus: null, dueAt: null, ...fields }) as unknown as FleetTask;

describe('documentsToReview', () => {
  it('pone primero lo vencido, después lo que vence pronto, lo vigente y lo que no tiene vencimiento', () => {
    const ordered = documentsToReview([
      task('sin', {}),
      task('vigente', { expirationStatus: 'current', dueAt: '2027-01-01' }),
      task('pronto', { expirationStatus: 'due_soon', dueAt: '2026-11-01' }),
      task('vencido', { expirationStatus: 'expired', dueAt: '2026-09-01' }),
    ]);
    expect(ordered.map((t) => t.taskId)).toEqual(['vencido', 'pronto', 'vigente', 'sin']);
  });

  it('dentro del mismo estado, el que vence antes va primero', () => {
    const ordered = documentsToReview([
      task('b', { expirationStatus: 'due_soon', dueAt: '2026-12-01' }),
      task('a', { expirationStatus: 'due_soon', dueAt: '2026-11-01' }),
    ]);
    expect(ordered.map((t) => t.taskId)).toEqual(['a', 'b']);
  });

  it('una tarea ya hecha no cuenta como vencida aunque conserve su estado, y las canceladas no se listan', () => {
    const ordered = documentsToReview([
      task('hecha', { status: 'done', expirationStatus: 'expired', dueAt: '2026-01-01' }),
      task('abierta', { expirationStatus: 'current', dueAt: '2027-01-01' }),
      task('cancelada', { status: 'cancelled' }),
    ]);
    expect(ordered.map((t) => t.taskId)).toEqual(['abierta', 'hecha']);
  });

  it('no modifica el arreglo recibido', () => {
    const input = [task('b', { dueAt: '2026-12-01' }), task('a', { dueAt: '2026-11-01' })];
    documentsToReview(input);
    expect(input.map((t) => t.taskId)).toEqual(['b', 'a']);
  });
});

describe('documentDueText', () => {
  it('el «venció» sale del estado de la API, no del signo de los días', () => {
    expect(documentDueText({ daysUntilDue: 0, expirationStatus: 'expired' })).toBe('Venció hoy');
    expect(documentDueText({ daysUntilDue: -3, expirationStatus: 'expired' })).toBe('Venció hace 3 días');
    expect(documentDueText({ daysUntilDue: 1, expirationStatus: 'due_soon' })).toBe('Vence en 1 día');
    expect(documentDueText({ daysUntilDue: 0, expirationStatus: 'due_soon' })).toBe('Vence hoy');
  });

  it('sin fecha límite no inventa un texto', () => {
    expect(documentDueText({ daysUntilDue: null, expirationStatus: null })).toBeNull();
  });
});
