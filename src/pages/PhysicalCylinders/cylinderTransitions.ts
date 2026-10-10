import type { Cylinder } from '../../services/api/types';

type CylinderState = Cylinder['state'];

/** `retired` es terminal: se llega por la baja (`PATCH /cylinders/:id/retire`), nunca por `/transition` (400). */
type MovableState = Exclude<CylinderState, 'retired'>;

/**
 * Espejo de `CYLINDER_TRANSITIONS` (`cylinder-state.machine.ts` del back):
 * sólo ofrece en la UI los próximos estados legales. El back igual valida.
 */
export const NEXT_STATES: Record<CylinderState, MovableState[]> = {
  in_depot: ['filled'],
  filled: ['dispatched', 'in_depot'],
  dispatched: ['with_customer', 'in_depot'],
  with_customer: ['empty_returned'],
  empty_returned: ['in_depot'],
  retired: [],
};

/** ¿Puede un envase en `from` pasar a `to` por `/transition`? */
export const canMoveTo = (from: CylinderState, to: CylinderState): boolean =>
  (NEXT_STATES[from] as CylinderState[]).includes(to);

export const ALL_STATES: CylinderState[] = [
  'in_depot',
  'filled',
  'dispatched',
  'with_customer',
  'empty_returned',
  'retired',
];

/** Estados desde los que se puede dar de baja un envase (el back responde 400 desde cualquier otro). */
export const RETIRABLE_STATES: CylinderState[] = ['in_depot', 'empty_returned'];

export const canRetire = (cylinder: Pick<Cylinder, 'state'>): boolean => RETIRABLE_STATES.includes(cylinder.state);

/** Un envase retirado no se edita (409). */
export const canEditCylinder = (cylinder: Pick<Cylinder, 'state'>): boolean => cylinder.state !== 'retired';

export const RETIRE_HINT = 'Sólo se puede dar de baja un envase que está en el depósito o que volvió vacío';

export const RETIRED_HINT = 'Un envase retirado es terminal: ya no cambia de estado';
