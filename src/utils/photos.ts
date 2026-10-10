import { PHOTO_ALLOWED_TYPES, photoMaxBytes, type PhotoKind } from '../services/api/photos';

const maxMb = (kind: PhotoKind) => Math.round(photoMaxBytes(kind) / (1024 * 1024));

/** `null` si el archivo pasa las reglas que también valida el back; si no, el mensaje para el usuario. */
export const photoFileError = (kind: PhotoKind, file: File): string | null => {
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) return 'La foto tiene que ser JPG, PNG o WEBP.';
  if (file.size > photoMaxBytes(kind)) return `La foto no puede superar los ${maxMb(kind)} MB.`;
  return null;
};

/** El back manda un `Error 4xx` pelado cuando no trae mensaje: en ese caso se explica el motivo en castellano. */
const GENERIC = /^Error \d{3}$/;

/** El mensaje de un error al subir o quitar la foto: el del back si lo trae y, si no, uno según el estado HTTP. */
export const photoErrorMessage = (kind: PhotoKind, status: number | null, backMessage: string): string => {
  if (backMessage && !GENERIC.test(backMessage)) return backMessage;
  if (status === 409) return 'Esta foto ya no se puede cambiar: el registro dejó de estar abierto.';
  if (status === 413) return `La foto no puede superar los ${maxMb(kind)} MB.`;
  if (status === 415) return 'La foto tiene que ser JPG, PNG o WEBP (el contenido del archivo tiene que coincidir).';
  if (status === 403) return 'No tenés permiso para cambiar esta foto.';
  return backMessage || 'No se pudo guardar la foto.';
};
