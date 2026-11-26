import type { Order } from '../../../services/api/types';

type AssignmentMethod = NonNullable<Order['assignmentMethod']>;

const LABELS: Record<AssignmentMethod, string> = {
  automatic: 'automático',
  manual_override: 'manual',
  route_sheet: 'hoja de ruta',
  batch: 'lote',
};

/** «Asignado: automático», «Asignado: manual»… Sin método (pedidos anteriores o sin chofer), nada. */
export const assignmentLabel = (method: Order['assignmentMethod']): string | null =>
  method ? `Asignado: ${LABELS[method]}` : null;
