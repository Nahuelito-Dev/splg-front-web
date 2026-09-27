import { z } from 'zod';
import type { SelectOption } from '../../common/components/ui';
import { isValidHexColor } from './coverageZoneUtils';

/** `CoverageZoneSurchargeType` del back. */
export const SURCHARGE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'fixed', label: 'Fijo' },
  { value: 'percentage', label: 'Porcentaje' },
];

/**
 * Reglas del formulario de zona: las mismas que valida `CreateCoverageZoneDto`
 * / `UpdateCoverageZoneDto` (nombre, etiqueta de hasta 40, recargo 0-100 si es
 * porcentual, color hexadecimal, prioridad entera no negativa, vigencia
 * `hasta` posterior a `desde`).
 */
export const zoneSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresá un nombre').max(120, 'Máximo 120 caracteres'),
    label: z.string().trim().max(40, 'Máximo 40 caracteres'),
    surchargeType: z.enum(['fixed', 'percentage']),
    surchargeValue: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo'),
    color: z.string().trim().refine(isValidHexColor, 'Elegí un color válido, por ejemplo #FF7A00'),
    priority: z.coerce
      .number({ invalid_type_error: 'Ingresá un número' })
      .int('Tiene que ser un número entero')
      .min(0, 'No puede ser negativo'),
    validFrom: z.string(),
    validUntil: z.string(),
    isActive: z.boolean(),
  })
  .refine((data) => data.surchargeType !== 'percentage' || data.surchargeValue <= 100, {
    message: 'Un recargo porcentual tiene que estar entre 0 y 100',
    path: ['surchargeValue'],
  })
  .refine((data) => !data.validFrom || !data.validUntil || data.validFrom <= data.validUntil, {
    message: 'Tiene que ser posterior a la fecha "desde"',
    path: ['validUntil'],
  });

export type ZoneFormValues = z.infer<typeof zoneSchema>;
