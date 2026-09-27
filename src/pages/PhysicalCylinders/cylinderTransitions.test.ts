import { describe, expect, it } from 'vitest';
import { ALL_STATES, NEXT_STATES } from './cylinderTransitions';

describe('NEXT_STATES', () => {
  it('espeja la máquina de estados del back (cylinder-state.machine.ts)', () => {
    expect(NEXT_STATES).toEqual({
      in_depot: ['filled'],
      filled: ['dispatched', 'in_depot'],
      dispatched: ['with_customer', 'in_depot'],
      with_customer: ['empty_returned'],
      empty_returned: ['in_depot'],
    });
  });

  it('todos los estados tienen al menos un próximo estado legal', () => {
    for (const state of ALL_STATES) {
      expect(NEXT_STATES[state].length).toBeGreaterThan(0);
    }
  });
});
