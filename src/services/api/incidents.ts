import { http } from './httpClient';
import type { CreateIncidentBody, Incident, ResolveIncidentBody, UpdateIncidentBody } from './types';

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

/** PATCH /incidents/:id: corrige el tipo o la descripción. Sólo una incidencia abierta (409 si no). */
export const updateIncident = async (id: string, body: UpdateIncidentBody): Promise<Incident> => {
  const { data } = await http.patch<Incident>(`/incidents/${id}`, body);
  return data;
};

/**
 * PATCH /incidents/:id/resolve: cierra una incidencia abierta con su nota. `status: 'discarded'` es la baja lógica
 * (la incidencia no corresponde): queda registrada, no se borra. 409 si ya no estaba abierta.
 */
export const resolveIncident = async (id: string, body: ResolveIncidentBody): Promise<Incident> => {
  const { data } = await http.patch<Incident>(`/incidents/${id}/resolve`, body);
  return data;
};
