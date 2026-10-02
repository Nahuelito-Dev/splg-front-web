/** Mismas reglas que valida el back al subir un adjunto de una tarea de flota. */
export const FLEET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const FLEET_ATTACHMENT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** `null` si el archivo pasa; el mensaje para el usuario si no. */
export const fleetAttachmentError = (file: File): string | null => {
  if (!FLEET_ATTACHMENT_ALLOWED_TYPES.includes(file.type)) {
    return 'Sólo se aceptan archivos PDF, JPG, PNG o WEBP.';
  }
  if (file.size > FLEET_ATTACHMENT_MAX_BYTES) {
    return 'El archivo no puede superar los 10 MB.';
  }
  return null;
};
