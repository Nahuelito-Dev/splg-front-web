import type { Cylinder } from '../../services/api/types';
import { canMoveTo } from './cylinderTransitions';

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

/** Los envases marcados que pueden pasar de verdad al estado pedido (la máquina de estados del back). */
export const movable = (cylinders: Cylinder[], toState: Cylinder['state']): Cylinder[] =>
  cylinders.filter((cylinder) => canMoveTo(cylinder.state, toState));

/** Cuántos envases se muestran como mucho en la ficha de un pedido o de un cliente (el máximo de la API); el resto, en Envases. */
export const CYLINDER_CARD_LIMIT = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El id de un filtro de la URL (`?order=`, `?customer=`) si es un UUID; si no, `undefined` (la API rechazaría el pedido). */
export const uuidOrUndefined = (value: string): string | undefined => (UUID.test(value) ? value : undefined);
