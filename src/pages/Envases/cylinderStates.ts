import { CylinderState } from '../../services/api/physicalCylinders';

/** Etiqueta legible de cada estado del ciclo físico del envase. */
export const STATE_LABELS: Record<CylinderState, string> = {
  in_depot: 'En depósito',
  filled: 'Llena',
  dispatched: 'Despachada',
  with_customer: 'Con cliente',
  empty_returned: 'Vacía retornada',
};

/** Clases Tailwind del badge por estado (mismo lenguaje visual del panel). */
export const STATE_BADGE: Record<CylinderState, string> = {
  in_depot: 'text-slate-600 bg-slate-50 border-slate-200',
  filled: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  dispatched: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  with_customer: 'text-amber-600 bg-amber-50 border-amber-100',
  empty_returned: 'text-sky-600 bg-sky-50 border-sky-100',
};

/**
 * Transiciones válidas (espejo de CYLINDER_TRANSITIONS del backend). Se usa para
 * ofrecer en la UI solo los próximos estados legales; el backend igual valida.
 */
export const NEXT_STATES: Record<CylinderState, CylinderState[]> = {
  in_depot: ['filled'],
  filled: ['dispatched', 'in_depot'],
  dispatched: ['with_customer', 'in_depot'],
  with_customer: ['empty_returned'],
  empty_returned: ['in_depot'],
};

export const ALL_STATES: CylinderState[] = [
  'in_depot',
  'filled',
  'dispatched',
  'with_customer',
  'empty_returned',
];
