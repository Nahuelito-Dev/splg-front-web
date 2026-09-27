import type { Cylinder } from '../../services/api/types';

type CylinderState = Cylinder['state'];

/**
 * Espejo de `CYLINDER_TRANSITIONS` (`cylinder-state.machine.ts` del back):
 * sólo ofrece en la UI los próximos estados legales. El back igual valida.
 */
export const NEXT_STATES: Record<CylinderState, CylinderState[]> = {
  in_depot: ['filled'],
  filled: ['dispatched', 'in_depot'],
  dispatched: ['with_customer', 'in_depot'],
  with_customer: ['empty_returned'],
  empty_returned: ['in_depot'],
};

export const ALL_STATES: CylinderState[] = ['in_depot', 'filled', 'dispatched', 'with_customer', 'empty_returned'];
