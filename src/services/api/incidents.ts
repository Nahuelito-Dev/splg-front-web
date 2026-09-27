import { http } from './httpClient';
import type { CreateIncidentBody, Incident, ResolveIncidentBody } from './types';

/** GET /incidents: incidencias de reparto reportadas por los choferes. */
export const listIncidents = async (): Promise<Incident[]> => {
  const { data } = await http.get<Incident[]>('/incidents');
  return data;
};

/**
 * POST /incidents: normalmente la carga el chofer durante el reparto, pero
 * la API también deja al admin y al super_admin (soporte que la registra
 * por teléfono). `reportedBy` sale del token de quien la crea, no se elige.
 */
export const createIncident = async (body: CreateIncidentBody): Promise<Incident> => {
  const { data } = await http.post<Incident>('/incidents', body);
  return data;
};

/** PATCH /incidents/:id/resolve: nota de resolución. */
export const resolveIncident = async (id: string, body: ResolveIncidentBody): Promise<Incident> => {
  const { data } = await http.patch<Incident>(`/incidents/${id}/resolve`, body);
  return data;
};
