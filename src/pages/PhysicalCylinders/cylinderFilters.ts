import type { Cylinder } from '../../services/api/types';
import { NEXT_STATES } from './cylinderTransitions';

export type CylinderStateFilter = Cylinder['state'] | 'all';

const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Envases de un estado (o todos) cuyo serial, producto o cliente contienen el término. */
export const filterCylinders = (
  cylinders: Cylinder[],
  { state, term }: { state: CylinderStateFilter; term: string },
): Cylinder[] => {
  const needle = normalize(term.trim());
  return cylinders.filter((cylinder) => {
    if (state !== 'all' && cylinder.state !== state) return false;
    if (!needle) return true;
    return [cylinder.serial, cylinder.gas_cylinder?.type, cylinder.current_customer?.full_name].some((field) =>
      normalize(field).includes(needle),
    );
  });
};

/** Cuántos envases hay en cada estado y en total, sobre la lista completa. */
export const countCylindersByState = (cylinders: Cylinder[]): Record<Cylinder['state'], number> & { all: number } => {
  const counts = { in_depot: 0, filled: 0, dispatched: 0, with_customer: 0, empty_returned: 0, all: cylinders.length };
  for (const cylinder of cylinders) counts[cylinder.state] += 1;
  return counts;
};

/** Los envases marcados que pueden pasar de verdad al estado pedido (la máquina de estados del back). */
export const movable = (cylinders: Cylinder[], toState: Cylinder['state']): Cylinder[] =>
  cylinders.filter((cylinder) => NEXT_STATES[cylinder.state].includes(toState));
