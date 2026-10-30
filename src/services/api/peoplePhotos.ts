import { env } from '../../config/env';
import { http } from './httpClient';
import type { PeoplePhotos, PeoplePhotosRequestBody } from './types';

/** Tope de ids por pedido que acepta el back (usuarios y legajos, cada uno). */
export const PEOPLE_PHOTOS_MAX = 100;

/**
 * POST /api/v2/people/photos: las fotos firmadas de varias personas en un solo pedido. Cada id pedido vuelve en la
 * respuesta; `null` si no tiene foto o no es de la distribuidora.
 */
export const getPeoplePhotos = async (body: PeoplePhotosRequestBody): Promise<PeoplePhotos> => {
  const { data } = await http.post<PeoplePhotos>('/people/photos', body, { baseURL: env.apiUrlV2 });
  return data;
};
