import { z } from 'zod';
import { isValidCuit, normalizeCuit } from '../../utils/cuit';
import { hasAtMostTwoDecimals } from '../Purchases/components/moneySchema';

const optionalText = (max: number) => z.string().trim().max(max, `No puede tener más de ${max} caracteres`);
/** Un número obligatorio: el campo vacío es un error, no un cero. */
const required = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number({ required_error: message, invalid_type_error: message }),
  );

const day = (message: string) =>
  z
    .string()
    .min(1, message)
    .regex(/^\d{4}-\d{2}-\d{2}$/, message);

/** `CreateInsurerDto`: el CUIT, si se carga, se valida con su dígito verificador. */
export const insurerSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre').max(120, 'No puede tener más de 120 caracteres'),
  taxId: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidCuit(normalizeCuit(v)), 'No es un CUIT válido (11 dígitos y dígito verificador)'),
  phone: optionalText(30).refine(
    (v) => v === '' || /^[0-9+()\-\s]{6,30}$/.test(v),
    'Sólo dígitos, espacios, +, guiones y paréntesis',
  ),
  email: z.union([z.literal(''), z.string().trim().email('Email inválido').max(120, 'Hasta 120 caracteres')]),
  website: optionalText(200),
  paymentUrl: optionalText(500).refine(
    (v) => v === '' || /^https?:\/\/\S+$/i.test(v),
    'Tiene que ser un enlace que empiece con http:// o https://',
  ),
  notes: optionalText(1000),
});

export type InsurerFormValues = z.infer<typeof insurerSchema>;

/** Alta de póliza con su plan de cuotas (`CreateInsurancePolicyDto`). */
export const policySchema = z
  .object({
    insurerId: z.string().min(1, 'Elegí la aseguradora'),
    policyNumber: z.string().trim().min(1, 'Ingresá el número de póliza').max(40, 'Hasta 40 caracteres'),
    coverage: z.string().trim().min(1, 'Ingresá la cobertura').max(1000, 'Hasta 1000 caracteres'),
    validFrom: day('Ingresá el inicio de la vigencia'),
    validTo: day('Ingresá el fin de la vigencia'),
    paymentCode: optionalText(60),
    count: required('Ingresá la cantidad de cuotas').pipe(
      z.number().int('Tiene que ser un número entero').min(1, 'Al menos 1 cuota').max(60, 'Hasta 60 cuotas'),
    ),
    amount: required('Ingresá el importe').pipe(
      z.number().gt(0, 'El importe tiene que ser mayor a 0').refine(hasAtMostTwoDecimals, 'Hasta 2 decimales'),
    ),
    firstDueDate: day('Ingresá el primer vencimiento'),
    graceDays: required('Ingresá los días de gracia').pipe(
      z.number().int('Tiene que ser un número entero').min(0, 'Entre 0 y 31 días').max(31, 'Entre 0 y 31 días'),
    ),
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validTo > v.validFrom, {
    path: ['validTo'],
    message: 'El fin tiene que ser posterior al inicio',
  });

export type PolicyFormValues = z.input<typeof policySchema>;

/** Edición de una póliza: sólo lo que el back deja cambiar (no la vigencia ni el plan). */
export const policyEditSchema = z.object({
  insurerId: z.string().min(1, 'Elegí la aseguradora'),
  policyNumber: z.string().trim().min(1, 'Ingresá el número de póliza').max(40, 'Hasta 40 caracteres'),
  coverage: z.string().trim().min(1, 'Ingresá la cobertura').max(1000, 'Hasta 1000 caracteres'),
  paymentCode: optionalText(60),
});

export type PolicyEditValues = z.infer<typeof policyEditSchema>;

/** La misma tolerancia de reloj del back (5 minutos) para una fecha de pago que no puede ser futura. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** Registrar el pago de una cuota: lo que quedó en el formulario después del escaneo, ya revisado. */
export const paymentSchema = z.object({
  paidAt: z
    .string()
    .min(1, 'Ingresá cuándo se pagó')
    .refine((v) => {
      const time = new Date(v).getTime();
      return Number.isNaN(time) || time <= Date.now() + FUTURE_TOLERANCE_MS;
    }, 'La fecha del pago no puede ser futura'),
  amount: required('Ingresá el importe pagado').pipe(
    z.number().gt(0, 'El importe tiene que ser mayor a 0').refine(hasAtMostTwoDecimals, 'Hasta 2 decimales'),
  ),
  operationNumber: optionalText(60),
  cashBoxId: z.string().min(1, 'Elegí la caja de la que salió el pago'),
});

export type PaymentFormValues = z.input<typeof paymentSchema>;
