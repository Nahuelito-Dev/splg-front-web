import { toApiErrorFromBlob } from './errors';
import { resolveFileSource, type FileLink, type FileSource } from './fileSource';
import { http } from './httpClient';
import type { Claim, CreateClaimBody, ReopenClaimBody, ResolveClaimBody } from './types';

/** GET /claims: todos los reclamos, acotados a la distribuidora del token. */
export const listClaims = async (): Promise<Claim[]> => {
  const { data } = await http.get<Claim[]>('/claims');
  return data;
};

/**
 * POST /claims: un admin lo carga a nombre de un cliente (soporte). El
 * `customerId` tiene que ser el dueño de `orderId` o la API contesta 400.
 */
export const createClaim = async (body: CreateClaimBody): Promise<Claim> => {
  const { data } = await http.post<Claim>('/claims', body);
  return data;
};

/** PATCH /claims/:id/resolve: nota de resolución y nuevo estado (sólo resolved/rejected desde acá: ver `ClaimDetailModal`). */
export const resolveClaim = async (id: string, body: ResolveClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/resolve`, body);
  return data;
};

/** PATCH /claims/:id/take: PENDING → IN_PROCESS, sin nota (sólo marca que un admin ya lo está mirando). */
export const takeClaim = async (id: string): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/take`, {});
  return data;
};

/** PATCH /claims/:id/reopen: RESOLVED/REJECTED → IN_PROCESS, con motivo obligatorio. */
export const reopenClaim = async (id: string, body: ReopenClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/reopen`, body);
  return data;
};

/**
 * GET /claims/:id/photo?modo=url: la URL de la foto, siempre 200: firmada (S3), externa vieja o `url: null` si el
 * reclamo no tiene foto. 404 sólo si el reclamo no existe. `Claim.photoUrl` vence, así que no se guarda: se pide
 * acá cada vez que se abre el reclamo.
 */
export const getClaimPhotoLink = async (id: string): Promise<FileLink> => {
  const { data } = await http.get<FileLink>(`/claims/${id}/photo`, { params: { modo: 'url' } });
  return data;
};

/** GET /claims/:id/photo: el archivo con el token de la sesión (driver local). */
export const downloadClaimPhoto = async (id: string): Promise<Blob> => {
  try {
    const { data } = await http.get<Blob>(`/claims/${id}/photo`, { responseType: 'blob' });
    return data;
  } catch (error) {
    throw await toApiErrorFromBlob(error);
  }
};

/** La foto del reclamo lista para mostrar: URL firmada directa (S3) o blob autenticado (local); `null` si no tiene. */
export const getClaimPhotoFile = (id: string): Promise<FileSource | null> =>
  resolveFileSource(
    () => getClaimPhotoLink(id),
    () => downloadClaimPhoto(id),
  );

/**
 * POST /claims/:id/photo (multipart `file`): sube o reemplaza la foto. 409 si el reclamo está cerrado, 413 si pasa
 * de 10 MB, 415 si no es JPG, PNG ni WEBP. Se fuerza el content-type para que axios no mande el FormData como JSON.
 */
export const uploadClaimPhoto = async (id: string, file: File): Promise<Claim> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<Claim>(`/claims/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
