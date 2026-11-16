import { z } from 'zod';
import type { ChatAttachment } from '../../services/api/types';
import { withAttachmentType } from '../../utils/attachments';

/**
 * Adjuntos del chat (`splg-docs/sistema/DISENO-COMUNICACION.md` §9.2). Las reglas son las del back por canal; acá se
 * validan antes de subir para no mandar algo que la API va a rechazar (413/415). La verdad sigue siendo la del back,
 * que mira el contenido y no la extensión.
 *
 * - `inbox`: la bandeja con clientes (C3) y choferes (C2): fotos JPG, PNG o WEBP hasta 5 MB y PDF hasta 10 MB.
 * - `support`: el chat y los tickets con la plataforma (C1): PDF, fotos, Word, Excel y CSV, hasta 10 MB.
 */
export type ChatAttachmentChannel = 'inbox' | 'support';

const MB = 1024 * 1024;
/** Largo del epígrafe que acepta la API (`caption`). */
export const CAPTION_MAX = 500;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_TYPE = 'text/csv';

interface ChannelRules {
  /** Tipo → tope en bytes. */
  limits: Record<string, number>;
  /** Para el `accept` del selector: tipos y extensiones (Word, Excel y CSV a veces llegan sin tipo). */
  accept: string;
  /** Qué se puede mandar, para el texto de ayuda y el error de tipo. */
  allowedText: string;
  sizeText: string;
}

const RULES: Record<ChatAttachmentChannel, ChannelRules> = {
  inbox: {
    limits: { ...Object.fromEntries(IMAGE_TYPES.map((type) => [type, 5 * MB])), [PDF_TYPE]: 10 * MB },
    accept: [...IMAGE_TYPES, PDF_TYPE].join(','),
    allowedText: 'fotos (JPG, PNG o WEBP) y PDF',
    sizeText: 'Fotos hasta 5 MB y PDF hasta 10 MB',
  },
  support: {
    limits: Object.fromEntries(
      [...IMAGE_TYPES, PDF_TYPE, DOCX_TYPE, XLSX_TYPE, CSV_TYPE].map((type) => [type, 10 * MB]),
    ),
    accept: [...IMAGE_TYPES, PDF_TYPE, DOCX_TYPE, XLSX_TYPE, CSV_TYPE, '.docx', '.xlsx', '.csv'].join(','),
    allowedText: 'PDF, fotos (JPG, PNG o WEBP), Word, Excel y CSV',
    sizeText: 'Hasta 10 MB',
  },
};

export const acceptOf = (channel: ChatAttachmentChannel): string => RULES[channel].accept;
export const limitsTextOf = (channel: ChatAttachmentChannel): string =>
  `${RULES[channel].sizeText}. Se pueden mandar ${RULES[channel].allowedText}.`;

export const isImageType = (mimeType: string): boolean => IMAGE_TYPES.includes(mimeType);

const formatLimit = (bytes: number) => `${bytes / MB} MB`;

/**
 * `null` si el archivo entra en el canal; si no, por qué. Word, Excel y CSV se reconocen también por la extensión
 * (el navegador a veces no informa el tipo).
 */
export const chatAttachmentError = (channel: ChatAttachmentChannel, file: File): string | null => {
  const rules = RULES[channel];
  const type = withAttachmentType(file).type;
  const limit = rules.limits[type];
  if (limit === undefined) return `En este chat se pueden mandar ${rules.allowedText}.`;
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > limit) {
    const what = isImageType(type) ? 'La foto' : 'El archivo';
    return `${what} supera el máximo permitido (${formatLimit(limit)}).`;
  }
  return null;
};

/** El formulario del adjunto: el archivo (tipo y tope del canal) y el epígrafe opcional. */
export const chatAttachmentSchema = (channel: ChatAttachmentChannel) =>
  z.object({
    file: z
      .custom<File | null>((value) => value === null || value instanceof File)
      .superRefine((file, ctx) => {
        if (!file) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Elegí un archivo' });
          return;
        }
        const error = chatAttachmentError(channel, file);
        if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
      }),
    caption: z.string().trim().max(CAPTION_MAX, `El epígrafe puede tener hasta ${CAPTION_MAX} caracteres`),
  });
export type ChatAttachmentValues = z.infer<ReturnType<typeof chatAttachmentSchema>>;

/** Qué se puede hacer con un adjunto según su escaneo (`scanStatus`). */
export type AttachmentState = 'ready' | 'pending' | 'failed' | 'blocked';

export const attachmentStateOf = (attachment: Pick<ChatAttachment, 'scanStatus'>): AttachmentState => {
  switch (attachment.scanStatus) {
    case 'clean':
    case 'not_required':
      return 'ready';
    case 'pending':
      return 'pending';
    case 'infected':
      return 'blocked';
    default:
      // `failed` y cualquier estado que el panel no conozca: no se ofrece el archivo.
      return 'failed';
  }
};
