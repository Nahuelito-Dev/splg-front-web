import type { Customer } from '../../services/api/types';

export type CustomerSegment = 'all' | 'active' | 'blocked';

export const CUSTOMER_SEGMENTS: CustomerSegment[] = ['all', 'active', 'blocked'];

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  all: 'Todos',
  active: 'Activos',
  blocked: 'Bloqueados',
};

const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Clientes de un segmento (cuenta activa o bloqueada) cuyo nombre, email o teléfono contienen el término. */
export const filterCustomers = (
  customers: Customer[],
  { segment, term }: { segment: CustomerSegment; term: string },
): Customer[] => {
  const needle = normalize(term.trim());
  return customers.filter((customer) => {
    const blocked = Boolean(customer.user?.blocked);
    if (segment === 'active' && blocked) return false;
    if (segment === 'blocked' && !blocked) return false;
    if (!needle) return true;
    return [customer.user?.full_name, customer.user?.email, customer.user?.phone_number].some((field) =>
      normalize(field).includes(needle),
    );
  });
};

export const countCustomersBySegment = (customers: Customer[]): Record<CustomerSegment, number> => {
  const blocked = customers.filter((customer) => customer.user?.blocked).length;
  return { all: customers.length, active: customers.length - blocked, blocked };
};
