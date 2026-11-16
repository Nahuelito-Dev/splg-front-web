import { env } from '../../config/env';
import { http } from './httpClient';
import type { ClaimPhotoLink, PhotoLink } from './types';

/** Qué tiene foto en el back y se maneja con el mismo componente. */
export type PhotoKind =
  | 'user'
  | 'car'
  | 'gasCylinder'
  | 'distributor'
  | 'incident'
  | 'claim'
  | 'employee'
  | 'supplier'
  | 'cylinder'
  | 'truckLoad';

interface PhotoSpec {
  path: (id: string) => string;
  /** El reclamo sube con POST; el resto con PUT. */
  uploadMethod: 'put' | 'post';
  maxBytes: number;
  /** Si el back tiene `DELETE .../photo` para este recurso; apagado, el botón «Quitar» no se dibuja. */
  removable: boolean;
  /** Las fotos nuevas de la v2 (proveedor, envase, carga) van a `/api/v2`; el resto, a la base de siempre. */
  baseURL?: string;
}

const MB = 1024 * 1024;

const SPECS: Record<PhotoKind, PhotoSpec> = {
  user: { path: (id) => `/users/${id}/photo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  car: { path: (id) => `/car/${id}/photo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  gasCylinder: { path: (id) => `/gascylinder/${id}/photo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  distributor: { path: (id) => `/distributor/${id}/logo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  incident: { path: (id) => `/incidents/${id}/photo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  employee: { path: (id) => `/employees/${id}/photo`, uploadMethod: 'put', maxBytes: 5 * MB, removable: true },
  claim: { path: (id) => `/claims/${id}/photo`, uploadMethod: 'post', maxBytes: 10 * MB, removable: true },
  supplier: {
    path: (id) => `/suppliers/${id}/photo`,
    uploadMethod: 'put',
    maxBytes: 5 * MB,
    removable: true,
    baseURL: env.apiUrlV2,
  },
  cylinder: {
    path: (id) => `/cylinders/${id}/photo`,
    uploadMethod: 'put',
    maxBytes: 5 * MB,
    removable: true,
    baseURL: env.apiUrlV2,
  },
  truckLoad: {
    path: (id) => `/truck-loads/${id}/photo`,
    uploadMethod: 'put',
    maxBytes: 5 * MB,
    removable: true,
    baseURL: env.apiUrlV2,
  },
};

export const photoMaxBytes = (kind: PhotoKind): number => SPECS[kind].maxBytes;
export const photoRemovable = (kind: PhotoKind): boolean => SPECS[kind].removable;

export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * GET .../photo?modo=url: la URL firmada vigente (o `url: null` si no hay foto). Es la forma de renovar una URL que
 * venció: el panel nunca arma ni guarda una URL de S3.
 */
export const getPhotoLink = async (kind: PhotoKind, id: string): Promise<PhotoLink | ClaimPhotoLink> => {
  const { data } = await http.get<PhotoLink | ClaimPhotoLink>(SPECS[kind].path(id), {
    params: { modo: 'url' },
    baseURL: SPECS[kind].baseURL,
  });
  return data;
};

/**
 * Sube o reemplaza la foto (multipart, campo `file`). 413 si pasa el tamaño, 415 si no es JPG, PNG ni WEBP, 409 si
 * la incidencia o el reclamo ya no admiten cambios. Se fuerza el content-type para que axios no mande el FormData
 * como JSON.
 */
export const uploadPhoto = async (kind: PhotoKind, id: string, file: File): Promise<void> => {
  const form = new FormData();
  form.append('file', file);
  await http.request({
    url: SPECS[kind].path(id),
    method: SPECS[kind].uploadMethod,
    baseURL: SPECS[kind].baseURL,
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** DELETE .../photo: quita la foto (el back borra el objeto del bucket en segundo plano). */
export const removePhoto = async (kind: PhotoKind, id: string): Promise<void> => {
  await http.delete(SPECS[kind].path(id), { baseURL: SPECS[kind].baseURL });
};
