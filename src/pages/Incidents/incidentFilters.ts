import type { Incident } from '../../services/api/types';

export type IncidentStatusFilter = Incident['status'] | 'all';
export type IncidentTypeFilter = Incident['type'] | 'all';

export const INCIDENT_STATUS_ORDER: Incident['status'][] = ['open', 'resolved', 'discarded'];
export const INCIDENT_TYPE_ORDER: Incident['type'][] = ['damaged', 'out_of_stock', 'no_show', 'other'];

const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Filters {
  status: IncidentStatusFilter;
  type: IncidentTypeFilter;
  term: string;
}

/** Incidencias de un estado y tipo (o todas) que contienen el término en el cliente, la descripción o el pedido. */
export const filterIncidents = (incidents: Incident[], { status, type, term }: Filters): Incident[] => {
  const needle = normalize(term.trim());
  return incidents.filter((incident) => {
    if (status !== 'all' && incident.status !== status) return false;
    if (type !== 'all' && incident.type !== type) return false;
    if (!needle) return true;
    return [
      incident.order?.customer?.full_name,
      incident.order?.customer?.phone_number,
      incident.description,
      incident.order_id,
    ].some((field) => normalize(field).includes(needle));
  });
};

/** Cuántas incidencias hay en cada estado y en total, sobre la lista completa. */
export const countIncidentsByStatus = (incidents: Incident[]): Record<Incident['status'], number> & { all: number } => {
  const counts = { open: 0, resolved: 0, discarded: 0, all: incidents.length };
  for (const incident of incidents) counts[incident.status] += 1;
  return counts;
};
