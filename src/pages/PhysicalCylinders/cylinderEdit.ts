import type { UpdateCylinderPatch } from '../../services/api/physicalCylinders';
import type { Cylinder } from '../../services/api/types';

export interface CylinderEditValues {
  serial: string;
  gasCylinderId: string;
  deposit: number;
  /** YYYY-MM-DD; vacío limpia la fecha. La revisión y el vencimiento no se editan acá: van por «Registrar revisión». */
  manufacturedAt: string;
}

/** El día (sin hora ni zona) de un date-time ISO: las fechas del envase son de calendario. */
export const dayOf = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '');

export const cylinderEditDefaults = (cylinder?: Cylinder | null): CylinderEditValues => ({
  serial: cylinder?.serial ?? '',
  gasCylinderId: cylinder?.gas_cylinder_id ?? '',
  deposit: cylinder?.deposit ?? 0,
  manufacturedAt: dayOf(cylinder?.manufactured_at),
});

/**
 * El cuerpo de `PATCH /cylinders/:id` con sólo lo que cambió. El back acepta `null` para limpiar el producto o una
 * fecha (probado contra la API), así que vaciar un campo viaja como `null`, no se pierde en silencio.
 */
export const buildCylinderUpdate = (cylinder: Cylinder, values: CylinderEditValues): UpdateCylinderPatch => {
  const before = cylinderEditDefaults(cylinder);
  const body: UpdateCylinderPatch = {};
  if (values.serial.trim() !== before.serial) body.serial = values.serial.trim();
  if (values.gasCylinderId !== before.gasCylinderId) body.gasCylinderId = values.gasCylinderId || null;
  if (Number(values.deposit) !== Number(before.deposit)) body.deposit = Number(values.deposit);
  if (values.manufacturedAt !== before.manufacturedAt) body.manufacturedAt = values.manufacturedAt || null;
  return body;
};
