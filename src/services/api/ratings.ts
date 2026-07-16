import { privateAxiosInstance } from './axiosConfig';

/** Quién emite la calificación (coincide con RaterRole del backend). */
export type RaterRole = 'customer' | 'delivery';

export interface Rating {
  rating_id: string;
  order_id: string;
  distributor_id?: string;
  from_user_id: string;
  to_user_id: string;
  from_role: RaterRole;
  /** Usuario que emitió la calificación (para mostrar el nombre en el panel). */
  fromUser?: { user_id: string; full_name?: string };
  stars: number;
  comment?: string;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

// GET /ratings/user/:userId/summary — promedio + cantidad de calificaciones
// recibidas. Simétrico: sirve tanto para choferes como para clientes (el
// backend ya no filtra por rol del que califica).
export const getRatingSummary = async (userId: string) => {
  const { data } = await privateAxiosInstance.get<RatingSummary>(
    `/ratings/user/${userId}/summary`,
  );
  return data;
};

// GET /ratings/user/:userId — historial completo de calificaciones recibidas
// por ese usuario (como chofer o como cliente, según corresponda).
export const getRatingsForUser = async (userId: string) => {
  const { data } = await privateAxiosInstance.get<Rating[]>(
    `/ratings/user/${userId}`,
  );
  return data;
};
