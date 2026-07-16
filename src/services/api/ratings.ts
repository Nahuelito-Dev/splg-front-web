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
  stars: number;
  comment?: string;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

// GET /ratings/user/:userId/summary — promedio + cantidad (calculado por el
// backend solo sobre calificaciones recibidas de clientes, es decir: válido
// cuando el usuario consultado es un chofer).
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
