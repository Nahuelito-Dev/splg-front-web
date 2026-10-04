/** Mismas reglas que valida el back al subir la foto de un reclamo (CU-174). */
export const CLAIM_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const CLAIM_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** `null` si el archivo pasa; el mensaje para el usuario si no. */
export const claimPhotoError = (file: File): string | null => {
  if (!CLAIM_PHOTO_ALLOWED_TYPES.includes(file.type)) return 'La foto tiene que ser JPG, PNG o WEBP.';
  if (file.size > CLAIM_PHOTO_MAX_BYTES) return 'La foto no puede superar los 10 MB.';
  return null;
};

/** El mensaje legible de un error al subir la foto, según el estado HTTP que contestó el back. */
export const claimPhotoUploadMessage = (status: number | null, fallback: string): string => {
  if (status === 409) return 'El reclamo está cerrado: reabrilo para cambiar la foto.';
  if (status === 413) return 'La foto no puede superar los 10 MB.';
  if (status === 415) return 'La foto tiene que ser JPG, PNG o WEBP (el contenido del archivo tiene que coincidir).';
  return fallback;
};
