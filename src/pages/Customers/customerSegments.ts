import type { CustomerStatus } from '../../services/api/customers';

/** `removed` no es un estado de la cuenta: son los clientes que la distribuidora dio de baja. */
export type CustomerSegment = 'all' | CustomerStatus | 'removed';

export const CUSTOMER_SEGMENTS: CustomerSegment[] = ['all', 'active', 'blocked', 'removed'];

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  all: 'Todos',
  active: 'Activos',
  blocked: 'Bloqueados',
  removed: 'Dados de baja',
};
