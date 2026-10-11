import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max, `Hasta ${max} caracteres`);

/** Reglas del legajo; repiten las del DTO del back (que valida de nuevo, incluido el dígito del CUIL). */
export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre').max(80, 'Hasta 80 caracteres'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido').max(80, 'Hasta 80 caracteres'),
  positionId: z.string().min(1, 'Elegí el puesto'),
  documentType: z.enum(['dni', 'passport', 'other']),
  documentNumber: z.string().trim().min(1, 'Ingresá el documento').max(20, 'Hasta 20 caracteres'),
  hireDate: z.string().min(1, 'Ingresá la fecha de ingreso'),
  employmentType: z.enum(['permanent', 'fixed_term', 'part_time', 'contractor']),
  fileNumber: optionalText(20),
  cuil: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\d{11}$/, 'Once dígitos, sin guiones'),
  ]),
  birthDate: z.string(),
  phone: optionalText(30),
  personalEmail: z.union([z.literal(''), z.string().trim().email('Email inválido').max(120)]),
  addressLine: optionalText(200),
  city: optionalText(80),
  province: optionalText(80),
  postalCode: optionalText(10),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(30),
  emergencyContactRelationship: optionalText(40),
  notes: z.string().trim().max(1000, 'Hasta 1000 caracteres'),
});

/** Al editar, el legajo ya tiene número y no puede quedar vacío. */
export const employeeEditSchema = employeeSchema.extend({
  fileNumber: z.string().trim().min(1, 'El número de legajo no puede quedar vacío').max(20, 'Hasta 20 caracteres'),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
