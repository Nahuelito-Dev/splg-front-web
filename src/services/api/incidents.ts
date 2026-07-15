import { privateAxiosInstance } from './axiosConfig';

export type IncidentType = 'damaged' | 'out_of_stock' | 'no_show' | 'other';
export type IncidentStatus = 'open' | 'resolved';

export interface Incident {
  incident_id: string;
  order_id: string;
  order?: {
    order_id: string;
    totalAmount: number;
    customer?: {
      full_name: string;
      email: string;
      phone_number: string;
    };
  };
  reported_by: string;
  type: IncidentType;
  description: string;
  photo_url?: string;
  status: IncidentStatus;
  resolution_note?: string;
  createdAt: string;
  resolvedAt?: string;
}

// GET ALL (admin) — incidencias reportadas por los choferes durante el reparto.
export const getAllIncidents = async () => {
  const { data } = await privateAxiosInstance.get<Incident[]>('/incidents');
  return data;
};

// RESOLVE — marca la incidencia como resuelta con una nota de resolución.
export const resolveIncident = async (id: string, resolutionNote: string) => {
  const { data } = await privateAxiosInstance.patch(
    `/incidents/${id}/resolve`,
    { resolutionNote },
  );
  return data;
};
