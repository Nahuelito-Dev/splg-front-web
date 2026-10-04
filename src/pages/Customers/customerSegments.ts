import type { CustomerStatus } from '../../services/api/customers';

export type CustomerSegment = 'all' | CustomerStatus;

export const CUSTOMER_SEGMENTS: CustomerSegment[] = ['all', 'active', 'blocked'];

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  all: 'Todos',
  active: 'Activos',
  blocked: 'Bloqueados',
};
