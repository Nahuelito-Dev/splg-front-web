/** Mismas reglas que valida el back al subir un adjunto genérico (`/attachments`). */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Extensiones de Word, Excel y CSV: los navegadores a veces mandan el tipo vacío o `application/vnd.ms-excel`. */
const OFFICE_EXTENSIONS = ['.docx', '.xlsx', '.csv'];

const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  DOCX_TYPE,
  XLSX_TYPE,
  'text/csv',
];

/** Para el `accept` del selector: los tipos MIME y las extensiones de Word, Excel y CSV. */
export const ATTACHMENT_ALLOWED_TYPES = [...ATTACHMENT_MIME_TYPES, ...OFFICE_EXTENSIONS];

const hasOfficeExtension = (name: string): boolean => {
  const lower = name.trim().toLowerCase();
  return OFFICE_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

/** `null` si el archivo pasa; si no, el mensaje amable. La validación real es la del back. */
export const attachmentFileError = (file: File): string | null => {
  if (!ATTACHMENT_MIME_TYPES.includes(file.type) && !hasOfficeExtension(file.name)) {
    return 'Sólo se aceptan archivos PDF, JPG, PNG, WEBP, Word (.docx), Excel (.xlsx) o CSV.';
  }
  if (file.size > ATTACHMENT_MAX_BYTES) return 'El archivo no puede superar los 10 MB.';
  return null;
};

const TYPE_BY_EXTENSION: Record<string, string> = { '.docx': DOCX_TYPE, '.xlsx': XLSX_TYPE, '.csv': 'text/csv' };

/**
 * El back compara el tipo declarado contra una lista exacta (y después verifica el contenido). Si el navegador no
 * informó el tipo de un Word, Excel o CSV, o mandó uno genérico (`text/plain`, `application/vnd.ms-excel`…), se
 * sube con el tipo que corresponde a su extensión.
 */
export const withAttachmentType = (file: File): File => {
  const lower = file.name.trim().toLowerCase();
  const extension = OFFICE_EXTENSIONS.find((ext) => lower.endsWith(ext));
  if (!extension) return file;
  const type = TYPE_BY_EXTENSION[extension];
  return file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
};

/** Formatos y tamaño máximo para mostrar junto al selector de adjuntos. */
export const ATTACHMENT_LIMITS_TEXT = `PDF, JPG, PNG, WEBP, Word, Excel o CSV, hasta ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`;

/** Word, Excel y CSV no se abren en el navegador: sólo se descargan. */
export const attachmentIsViewable = (mimeType: string): boolean =>
  mimeType === 'application/pdf' || mimeType.startsWith('image/');
