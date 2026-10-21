import { z } from 'zod';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = (max: number) => z.string().trim().max(max, `Hasta ${max} caracteres`);
const optionalEmail = z.union([z.literal(''), z.string().trim().email('Email inválido')]);

/** Los datos de la empresa; repiten los límites de `CreateDistributorDto`. */
const businessFields = {
  name: z.string().trim().min(2, 'Ingresá el nombre (mínimo 2 caracteres)').max(120, 'Hasta 120 caracteres'),
  legal_name: optionalText(160),
  tax_id: optionalText(20),
  email: optionalEmail,
  phone: z.string().trim(),
};

/** Alta: además lleva el slug, que después no se cambia. */
export const distributorCreateSchema = z.object({
  ...businessFields,
  slug: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(60, 'Hasta 60 caracteres')
    .regex(SLUG_RE, 'Minúsculas, números y guiones (ej: jeny-gas)'),
});

/** Edición: todo menos el slug. */
export const distributorEditSchema = z.object(businessFields);

export type DistributorCreateValues = z.infer<typeof distributorCreateSchema>;
export type DistributorEditValues = z.infer<typeof distributorEditSchema>;
