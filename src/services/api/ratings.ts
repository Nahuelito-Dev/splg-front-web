import { http } from './httpClient';
import type { Rating, RatingSummary } from './types';

/**
 * GET /ratings/user/:userId/summary — promedio y cantidad de calificaciones
 * recibidas. Sirve tanto para choferes como para clientes: las calificaciones
 * son bidireccionales (cliente↔chofer al finalizar un pedido).
 */
export const getRatingSummary = async (userId: string): Promise<RatingSummary> => {
  const { data } = await http.get<RatingSummary>(`/ratings/user/${userId}/summary`);
  return data;
};

/** GET /ratings/user/:userId — historial completo de calificaciones recibidas. */
export const listRatingsForUser = async (userId: string): Promise<Rating[]> => {
  const { data } = await http.get<Rating[]>(`/ratings/user/${userId}`);
  return data;
};
