import { z } from 'zod';

/** `CreateWarehouseDto`: el código se guarda en mayúsculas y es único entre los galpones vigentes. */
export const warehouseSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(80, 'No puede tener más de 80 caracteres'),
  code: z
    .string()
    .trim()
    .min(1, 'Ingresá un código')
    .max(12, 'No puede tener más de 12 caracteres')
    .regex(/^[A-Za-z0-9_-]+$/, 'Sólo letras, dígitos, guion o guion bajo'),
  kind: z.enum(['depot', 'branch'], { message: 'Elegí el tipo' }),
  address: z.string().trim().max(300, 'No puede tener más de 300 caracteres'),
  isDefault: z.boolean(),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;

/** Alta: lo que se completó; la dirección vacía no se manda. */
export const warehouseCreateBody = (values: WarehouseFormValues) => ({
  name: values.name,
  code: values.code,
  kind: values.kind,
  address: values.address || undefined,
  isDefault: values.isDefault,
});

/**
 * Edición: la dirección vacía es `null` (borra la guardada); la marca de predeterminado sólo viaja si cambia (la API
 * rechaza marcar un galpón inactivo).
 */
export const warehouseUpdateBody = (values: WarehouseFormValues, current: { isDefault: boolean }) => ({
  name: values.name,
  code: values.code,
  kind: values.kind,
  address: values.address || null,
  ...(values.isDefault !== current.isDefault ? { isDefault: values.isDefault } : {}),
});
