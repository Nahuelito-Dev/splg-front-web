/** Mismas reglas que valida el back al subir un adjunto genérico (`/attachments`). */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ATTACHMENT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** `null` si el archivo pasa; si no, el mensaje amable. La validación real es la del back. */
export const attachmentFileError = (file: File): string | null => {
  if (!ATTACHMENT_ALLOWED_TYPES.includes(file.type)) return 'Sólo se aceptan archivos PDF, JPG, PNG o WEBP.';
  if (file.size > ATTACHMENT_MAX_BYTES) return 'El archivo no puede superar los 10 MB.';
  return null;
};

/** Formatos y tamaño máximo para mostrar junto al selector de adjuntos. */
export const ATTACHMENT_LIMITS_TEXT = `PDF, JPG, PNG o WEBP, hasta ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`;
