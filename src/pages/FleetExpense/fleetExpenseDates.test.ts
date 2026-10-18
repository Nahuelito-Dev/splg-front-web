import { describe, expect, it } from 'vitest';
import { fromLocalInput, toLocalInput } from './fleetExpenseDates';

describe('fecha y hora de un formulario', () => {
  it('ida y vuelta conserva el instante hasta el minuto', () => {
    const iso = new Date(2026, 9, 17, 14, 35).toISOString();
    const local = toLocalInput(iso);
    expect(local).toBe('2026-10-17T14:35');
    expect(fromLocalInput(local)).toBe(iso);
  });

  it('vacío o inválido no inventa una fecha', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('basura')).toBe('');
    expect(fromLocalInput('')).toBeUndefined();
    expect(fromLocalInput('basura')).toBeUndefined();
  });
});
