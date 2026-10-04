import type { DownloadLink } from './types';

/** El link de descarga; `url` es `null` cuando no hay archivo (un reclamo sin foto). */
export type FileLink = Omit<DownloadLink, 'url'> & { url: string | null };

/**
 * De dónde sale un archivo del back. Con S3 el back devuelve una URL firmada que se abre directo, sin
 * `Authorization` (pedirla con axios rompería por CORS); con el driver local el archivo sólo se baja con
 * el token de la sesión, así que se trae como blob.
 */
export type FileSource = { kind: 'url'; url: string; expiresAt: string | null } | { kind: 'blob'; blob: Blob };

/**
 * Pide `?modo=url`: si el back dice que la URL no exige token (`requiresAuth` false) se usa tal cual; si lo exige
 * (driver local), se baja el archivo con la descarga autenticada de siempre.
 */
export const resolveFileSource = async (
  getLink: () => Promise<FileLink>,
  getBlob: () => Promise<Blob>,
): Promise<FileSource | null> => {
  const link = await getLink();
  if (link.url === null) return null;
  if (!link.requiresAuth) return { kind: 'url', url: link.url, expiresAt: link.expiresAt };
  return { kind: 'blob', blob: await getBlob() };
};
