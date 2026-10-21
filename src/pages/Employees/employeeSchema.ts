import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max, `Hasta ${max} caracteres`);

const CUIL_PREFIXES = ['20', '23', '24', '27'];
const CUIL_FACTORS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Lo mismo que `esCuilValido` del back: prefijo de persona humana y dígito verificador módulo 11. */
export const isValidCuil = (cuil: string): boolean => {
  if (!/^\d{11}$/.test(cuil) || !CUIL_PREFIXES.includes(cuil.slice(0, 2))) return false;
  const sum = CUIL_FACTORS.reduce((acc, factor, i) => acc + factor * Number(cuil[i]), 0);
  const rest = sum % 11;
  const check = rest === 0 ? 0 : 11 - rest;
  return check < 10 && check === Number(cuil[10]);
};

/** Fecha de calendario `YYYY-MM-DD` que existe (el back usa `IsISO8601` estricto). */
export const isRealDay = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const DAY_MESSAGE = 'Fecha inválida';

/** Reglas del legajo; repiten las del DTO del back (que valida de nuevo, incluido el dígito del CUIL). */
export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre').max(80, 'Hasta 80 caracteres'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido').max(80, 'Hasta 80 caracteres'),
  positionId: z.string().min(1, 'Elegí el puesto'),
  documentType: z.enum(['dni', 'passport', 'other']),
  documentNumber: z.string().trim().min(1, 'Ingresá el documento').max(20, 'Hasta 20 caracteres'),
  hireDate: z
    .string()
    .min(1, 'Ingresá la fecha de ingreso')
    .refine((value) => value === '' || isRealDay(value), DAY_MESSAGE),
  employmentType: z.enum(['permanent', 'fixed_term', 'part_time', 'contractor']),
  fileNumber: optionalText(20),
  cuil: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\d{11}$/, 'Once dígitos, sin guiones')
      .refine(isValidCuil, 'El CUIL no es válido: revisá el prefijo y el dígito verificador'),
  ]),
  birthDate: z.union([z.literal(''), z.string().refine(isRealDay, DAY_MESSAGE)]),
  phone: optionalText(30),
  personalEmail: z.union([z.literal(''), z.string().trim().email('Email inválido').max(120)]),
  addressLine: optionalText(200),
  city: optionalText(80),
  province: optionalText(80),
  postalCode: optionalText(10),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(30),
  emergencyContactRelationship: optionalText(40),
  notes: z.string().trim().max(2000, 'Hasta 2000 caracteres'),
});

/** Al editar, el legajo ya tiene número y no puede quedar vacío. */
export const employeeEditSchema = employeeSchema.extend({
  fileNumber: z.string().trim().min(1, 'El número de legajo no puede quedar vacío').max(20, 'Hasta 20 caracteres'),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
