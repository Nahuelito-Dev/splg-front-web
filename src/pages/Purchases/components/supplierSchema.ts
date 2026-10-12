import { z } from 'zod';
import { isValidCuit, normalizeCuit } from '../../../utils/cuit';

const optionalText = (max: number) => z.string().trim().max(max, `No puede tener más de ${max} caracteres`);

/** `CreateSupplierDto`: el CUIT se valida con su dígito verificador y se manda sin guiones. */
export const supplierSchema = z.object({
  businessName: z.string().trim().min(1, 'Ingresá la razón social').max(120, 'No puede tener más de 120 caracteres'),
  cuit: z
    .string()
    .trim()
    .min(1, 'Ingresá el CUIT')
    .refine((value) => isValidCuit(normalizeCuit(value)), 'No es un CUIT válido (11 dígitos y dígito verificador)'),
  kind: z.enum(['filling_plant', 'other'], { message: 'Elegí el tipo' }),
  contactName: optionalText(80),
  phone: optionalText(30).refine(
    (v) => v === '' || /^[0-9+()\-\s]{6,30}$/.test(v),
    'Sólo dígitos, espacios, +, guiones y paréntesis',
  ),
  email: z.union([z.literal(''), z.string().trim().email('Email inválido').max(120, 'Hasta 120 caracteres')]),
  address: optionalText(300),
  paymentTermsDays: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 365), 'Entre 0 y 365 días (0 = contado)'),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
