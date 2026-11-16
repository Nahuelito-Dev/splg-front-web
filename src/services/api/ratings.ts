import { http } from './httpClient';
import type { ModerateRatingBody, Rating, RatingSummary } from './types';

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

/** GET /ratings/:id — una calificación, también si está oculta. */
export const getRating = async (id: string): Promise<Rating> => {
  const { data } = await http.get<Rating>(`/ratings/${id}`);
  return data;
};

/**
 * PATCH /ratings/:id/hide — oculta la calificación con un motivo: deja de contar en el promedio y el resumen.
 * No se borra (baja lógica). 409 si ya estaba oculta.
 */
export const hideRating = async (id: string, body: ModerateRatingBody): Promise<Rating> => {
  const { data } = await http.patch<Rating>(`/ratings/${id}/hide`, body);
  return data;
};

/** PATCH /ratings/:id/unhide — vuelve a mostrarla y a contarla. 409 si no estaba oculta. */
export const unhideRating = async (id: string, body: ModerateRatingBody): Promise<Rating> => {
  const { data } = await http.patch<Rating>(`/ratings/${id}/unhide`, body);
  return data;
};
