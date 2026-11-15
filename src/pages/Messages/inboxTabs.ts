import type { InboxChannel, InboxQuery } from '../../services/api/inbox';

export type InboxTab = 'unassigned' | 'mine' | 'all' | 'closed';
export type InboxFilter = 'all' | InboxChannel;

export const isInboxTab = (value: string): value is InboxTab =>
  value === 'unassigned' || value === 'mine' || value === 'all' || value === 'closed';
export const isInboxFilter = (value: string): value is InboxFilter =>
  value === 'all' || value === 'staff_customer' || value === 'staff_driver';

/**
 * Lo que pide cada pestaña: las abiertas sin asignar, las abiertas mías, todas las abiertas (el número de `counts.open`
 * es el de esa lista) y las cerradas (en lectura; sin contador, la API no lo da).
 */
export const tabQuery = (tab: InboxTab): Pick<InboxQuery, 'assigned' | 'status'> =>
  tab === 'unassigned'
    ? { assigned: 'none', status: 'open' }
    : tab === 'mine'
      ? { assigned: 'me', status: 'open' }
      : tab === 'all'
        ? { status: 'open' }
        : { status: 'closed' };
