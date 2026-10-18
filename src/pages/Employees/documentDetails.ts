import { z } from 'zod';
import type { FleetPlan } from '../../services/api/types';

type DocumentKind = NonNullable<FleetPlan['documentKind']>;

/** Un campo del detalle propio de un tipo de documento (lo que valida el back en `details`). */
export interface DetailField {
  key: string;
  label: string;
  max: number;
  type: 'text' | 'date';
  placeholder?: string;
}

/**
 * Los tipos de documento del personal que llevan detalle (CU-183 a CU-185) y los campos que pide el back en cada
 * uno: son obligatorios y no admite otros. El resto de los tipos no lleva detalle.
 */
export const DETAIL_FIELDS: Partial<Record<DocumentKind, readonly DetailField[]>> = {
  hazmat_driver_course: [
    { key: 'certificateNumber', label: 'Número de certificado', max: 40, type: 'text', placeholder: '123/26' },
    { key: 'issuer', label: 'Emisor', max: 80, type: 'text', placeholder: 'CNRT' },
  ],
  psychophysical: [{ key: 'examDate', label: 'Fecha del examen', max: 10, type: 'date' }],
  art_coverage: [
    { key: 'insurer', label: 'Aseguradora', max: 80, type: 'text', placeholder: 'Galeno ART' },
    { key: 'policyNumber', label: 'Número de póliza', max: 40, type: 'text' },
  ],
};

export const detailFieldsOf = (kind: FleetPlan['documentKind']): readonly DetailField[] =>
  (kind && DETAIL_FIELDS[kind]) || [];

/** Los planes de personal que se cargan desde la ficha del empleado (los de chofer cuelgan de su perfil de reparto). */
export const isEmployeePlan = (plan: Pick<FleetPlan, 'subject'>): boolean => plan.subject === 'employee';

/**
 * El esquema del formulario de un documento: el vencimiento es obligatorio y cada campo del detalle también, con el
 * mismo largo máximo que el back.
 */
export const documentFormSchema = (kind: FleetPlan['documentKind']) => {
  const shape: Record<string, z.ZodString> = {};
  for (const field of detailFieldsOf(kind)) {
    shape[field.key] =
      field.type === 'date'
        ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Ingresá ${field.label.toLowerCase()}`)
        : z
            .string()
            .trim()
            .min(1, `Ingresá ${field.label.toLowerCase()}`)
            .max(field.max, `Hasta ${field.max} caracteres`);
  }
  return z.object({
    dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá la fecha de vencimiento'),
    notes: z.string().trim().max(2000, 'Hasta 2000 caracteres'),
    details: z.object(shape),
  });
};

export type DocumentFormValues = z.infer<ReturnType<typeof documentFormSchema>>;

/** Los valores iniciales del formulario: los del documento que se renueva (menos el vencimiento) o vacíos. */
export const documentFormDefaults = (
  kind: FleetPlan['documentKind'],
  previous: { details: Record<string, string> | null } | null,
): DocumentFormValues => ({
  dueAt: '',
  notes: '',
  details: Object.fromEntries(
    detailFieldsOf(kind).map((field) => [
      field.key,
      // El psicofísico se renueva con un examen nuevo: no se arrastra la fecha del anterior.
      field.type === 'date' ? '' : (previous?.details?.[field.key] ?? ''),
    ]),
  ),
});
