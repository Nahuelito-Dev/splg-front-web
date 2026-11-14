import { z } from 'zod';

/** Un punto en grados WGS 84. */
export interface WarehousePoint {
  latitude: number;
  longitude: number;
}

/** El texto de una coordenada como número (acepta coma decimal); `null` si está vacío o no es un número finito. */
export const parseCoordinate = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

const RANGES = {
  latitude: { min: -90, max: 90, label: 'La latitud', pair: 'la longitud' },
  longitude: { min: -180, max: 180, label: 'La longitud', pair: 'la latitud' },
} as const;

/**
 * `CreateWarehouseV2Dto` / `UpdateWarehouseV2Dto`: el código se guarda en mayúsculas y es único entre los galpones
 * vigentes; la ubicación (salida de las hojas de ruta) va con latitud y longitud juntas o ninguna, en rango.
 */
export const warehouseSchema = z
  .object({
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
    latitude: z.string(),
    longitude: z.string(),
  })
  .superRefine((values, ctx) => {
    const filled = {
      latitude: values.latitude.trim() !== '',
      longitude: values.longitude.trim() !== '',
    };
    for (const field of ['latitude', 'longitude'] as const) {
      const range = RANGES[field];
      if (!filled[field]) {
        const other = field === 'latitude' ? 'longitude' : 'latitude';
        if (filled[other])
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `Va junto con ${range.pair}: completá las dos o ninguna`,
          });
        continue;
      }
      const value = parseCoordinate(values[field]);
      if (value === null)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${range.label} tiene que ser un número` });
      else if (value < range.min || value > range.max)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${range.label} va de ${range.min} a ${range.max}`,
        });
    }
  });

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;

/** La ubicación del formulario ya validado; `null` si quedó sin ubicar. */
export const locationOf = (values: Pick<WarehouseFormValues, 'latitude' | 'longitude'>): WarehousePoint | null => {
  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude };
};

/** Una coordenada guardada como texto del formulario (6 decimales, ~10 cm). */
export const coordinateText = (value: number | null | undefined) => (value == null ? '' : value.toFixed(6));

/** Alta: lo que se completó; la dirección vacía y la ubicación sin cargar no se mandan. */
export const warehouseCreateBody = (values: WarehouseFormValues) => {
  const point = locationOf(values);
  return {
    name: values.name,
    code: values.code,
    kind: values.kind,
    address: values.address || undefined,
    isDefault: values.isDefault,
    ...(point ?? {}),
  };
};

interface CurrentWarehouse {
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Edición: la dirección vacía es `null` (borra la guardada); la marca de predeterminado sólo viaja si cambia (la API
 * rechaza marcar un galpón inactivo). La ubicación viaja sólo si cambia: las dos en `null` la borran.
 */
export const warehouseUpdateBody = (values: WarehouseFormValues, current: CurrentWarehouse) => {
  const point = locationOf(values);
  const had = current.latitude != null && current.longitude != null;
  const same = point
    ? had &&
      coordinateText(point.latitude) === coordinateText(current.latitude) &&
      coordinateText(point.longitude) === coordinateText(current.longitude)
    : !had;
  return {
    name: values.name,
    code: values.code,
    kind: values.kind,
    address: values.address || null,
    ...(values.isDefault !== current.isDefault ? { isDefault: values.isDefault } : {}),
    ...(same ? {} : (point ?? { latitude: null, longitude: null })),
  };
};
