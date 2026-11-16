import { z } from 'zod';
import type { CarDocumentType } from '../../services/api/carDocuments';

/** Mismo tope que valida el back (`MAX_ATTACHMENT_SIZE_BYTES`). */
export const CAR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf', ...IMAGE_TYPES];

/** Qué se sube: un documento (va a `/documents` con su tipo) o la foto de la patente (va a `/patent-photo`). */
export type CarDocumentKind = CarDocumentType | 'patente';

export const CAR_DOCUMENT_KIND_OPTIONS: { value: CarDocumentKind; label: string }[] = [
  { value: 'seguro', label: 'Seguro' },
  { value: 'vtv', label: 'VTV' },
  { value: 'cedula', label: 'Cédula del vehículo' },
  { value: 'otro', label: 'Otro documento' },
  { value: 'patente', label: 'Foto de la patente' },
];

/** Los tipos que acepta cada carga: la foto de la patente sólo es imagen. */
export const acceptedTypesFor = (kind: CarDocumentKind): string[] =>
  kind === 'patente' ? IMAGE_TYPES : DOCUMENT_TYPES;

export const limitsTextFor = (kind: CarDocumentKind): string =>
  kind === 'patente' ? 'JPG, PNG o WEBP, hasta 10 MB' : 'PDF, JPG, PNG o WEBP, hasta 10 MB';

export const carDocumentSchema = z
  .object({
    kind: z.enum(['seguro', 'vtv', 'cedula', 'otro', 'patente'], {
      errorMap: () => ({ message: 'Elegí qué documento vas a subir.' }),
    }),
    file: z.custom<File | null>((value) => value === null || value instanceof File).nullable(),
  })
  .superRefine(({ kind, file }, ctx) => {
    if (!file) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['file'], message: 'Elegí el archivo a subir.' });
      return;
    }
    if (!acceptedTypesFor(kind).includes(file.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['file'],
        message:
          kind === 'patente'
            ? 'La foto de la patente tiene que ser JPG, PNG o WEBP.'
            : 'Sólo se aceptan archivos PDF, JPG, PNG o WEBP.',
      });
    }
    if (file.size === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['file'], message: 'El archivo está vacío.' });
    }
    if (file.size > CAR_DOCUMENT_MAX_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['file'], message: 'El archivo no puede superar los 10 MB.' });
    }
  });

export type CarDocumentForm = z.infer<typeof carDocumentSchema>;
