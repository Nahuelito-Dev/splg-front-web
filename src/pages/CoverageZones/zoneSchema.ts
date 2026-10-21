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
  .refine((data) => !data.validFrom || !data.validUntil || data.validFrom < data.validUntil, {
    message: 'validUntil tiene que ser posterior a validFrom',
    path: ['validUntil'],
  });

export type ZoneFormValues = z.infer<typeof zoneSchema>;

interface ZoneLike {
  coverage_zone_id: string;
  name: string;
  priority: number;
  isActive: boolean;
}

/** La prioridad que propone el alta: por encima de las zonas activas que ya hay (igual que el back sin prioridad). */
export const nextZonePriority = (zones: readonly ZoneLike[]): number =>
  zones.filter((zone) => zone.isActive).reduce((max, zone) => Math.max(max, zone.priority + 1), 0);

/**
 * Lo que el back responde con 409: entre las zonas activas no se repiten el nombre (sin distinguir mayúsculas)
 * ni la prioridad. Una zona inactiva no choca con nadie.
 */
export const findZoneConflict = (
  values: Pick<ZoneFormValues, 'name' | 'priority' | 'isActive'>,
  zones: readonly ZoneLike[],
  editingId?: string,
): { field: 'name' | 'priority'; message: string } | null => {
  if (!values.isActive) return null;
  const rest = zones.filter((zone) => zone.isActive && zone.coverage_zone_id !== editingId);
  const sameName = rest.find((zone) => zone.name.trim().toLowerCase() === values.name.trim().toLowerCase());
  if (sameName) return { field: 'name', message: `Ya existe una zona activa con el nombre «${sameName.name}»` };
  const samePriority = rest.find((zone) => zone.priority === values.priority);
  if (samePriority) {
    return {
      field: 'priority',
      message: `La zona «${samePriority.name}» ya tiene la prioridad ${values.priority}: cada zona activa tiene una prioridad distinta`,
    };
  }
  return null;
};
