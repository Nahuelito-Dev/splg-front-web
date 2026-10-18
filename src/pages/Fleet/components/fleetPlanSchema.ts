import { z } from 'zod';

/** Un texto opcional: vacío se manda como `undefined` (el carType "todos"). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede tener más de ${max} caracteres`)
    .optional()
    .transform((value) => value || undefined);

/** `CreateFleetPlanDto`/`UpdateFleetPlanDto` (CU-105/140): la regla que dispara las tareas. */
export const fleetPlanSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresá un nombre').max(120, 'No puede tener más de 120 caracteres'),
    subject: z.enum(['vehicle', 'driver', 'employee'], { message: 'Elegí a qué aplica' }),
    trigger: z.enum(['by_km', 'by_time', 'by_fixed_date'], { message: 'Elegí qué dispara el vencimiento' }),
    intervalKm: z.coerce.number().int('Tiene que ser un número entero').positive('Tiene que ser mayor a 0').optional(),
    intervalMonths: z.coerce
      .number()
      .int('Tiene que ser un número entero')
      .positive('Tiene que ser mayor a 0')
      .optional(),
    leadTimeDays: z.coerce.number().int('Tiene que ser un número entero').nonnegative('No puede ser negativo'),
    criticality: z.enum(['blocking', 'non_blocking'], { message: 'Elegí la criticidad' }),
    carType: optionalText(60),
    // Qué documento es: para el personal (CU-183 a CU-185) define el formulario al cargarlo;
    // para el vehículo (CU-197) lo reconoce el sistema (seguro, VTV, habilitación de mercancías peligrosas).
    documentKind: z.enum([
      '',
      'hazmat_driver_course',
      'psychophysical',
      'art_coverage',
      'generic',
      'insurance',
      'vtv',
      'hazmat_vehicle_permit',
      'service',
      'driver_license',
    ]),
    appliesToCategories: z.array(
      z.enum(['driver', 'helper', 'warehouse', 'administration', 'sales', 'management', 'other']),
    ),
    isActive: z.boolean(),
  })
  .refine((values) => values.trigger !== 'by_km' || values.intervalKm !== undefined, {
    message: 'Obligatorio con este disparador',
    path: ['intervalKm'],
  })
  .refine((values) => values.trigger !== 'by_time' || values.intervalMonths !== undefined, {
    message: 'Obligatorio con este disparador',
    path: ['intervalMonths'],
  });

export type FleetPlanFormValues = z.infer<typeof fleetPlanSchema>;
