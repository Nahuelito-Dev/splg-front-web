import { describe, expect, it } from 'vitest';
import { ALL_STATES, canEditCylinder, canRetire, NEXT_STATES } from './cylinderTransitions';

describe('NEXT_STATES', () => {
  it('espeja la máquina de estados del back (cylinder-state.machine.ts)', () => {
    expect(NEXT_STATES).toEqual({
      in_depot: ['filled'],
      filled: ['dispatched', 'in_depot'],
      dispatched: ['with_customer', 'in_depot'],
      with_customer: ['empty_returned'],
      empty_returned: ['in_depot'],
      retired: [],
    });
  });

  it('todos los estados tienen entrada, y sólo el retirado (terminal) no tiene próximo estado', () => {
    for (const state of ALL_STATES) {
      expect(NEXT_STATES[state]).toBeDefined();
      if (state !== 'retired') expect(NEXT_STATES[state].length).toBeGreaterThan(0);
    }
    expect(NEXT_STATES.retired).toEqual([]);
  });
});

describe('baja y edición', () => {
  it('sólo se da de baja desde el depósito o vacío devuelto', () => {
    expect(ALL_STATES.filter((state) => canRetire({ state }))).toEqual(['in_depot', 'empty_returned']);
  });

  it('un envase retirado no se edita', () => {
    expect(canEditCylinder({ state: 'retired' })).toBe(false);
    expect(canEditCylinder({ state: 'filled' })).toBe(true);
  });
});
