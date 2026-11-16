import { z } from 'zod';
import type { SelectOption } from '../../../../common/components/ui';

/**
 * Reglas de una dirección, las mismas que valida la API
 * (`CreateUserAddressDto`/`UpdateUserAddressDto`): `street` y `city`
 * obligatorios, `latitude`/`longitude` dentro de rango (se cargan con el
 * mapa, no a mano) y el resto opcional. `placeId` no se pide: es el
 * identificador que arma el servicio de mapas cuando geocodifica una
 * búsqueda, y acá el punto lo elige la persona directamente sobre el mapa.
 */
export const GEOCODE_PRECISION_OPTIONS: SelectOption[] = [
  { value: 'exact', label: 'Exacta (coincide con el punto real)' },
  { value: 'approximate', label: 'Aproximada (se ubicó a mano en el mapa)' },
  { value: 'unresolved', label: 'Sin resolver' },
];

/** NaN (sin punto elegido todavía) cuenta como "sin valor", no como un número inválido. */
const coordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'number' && Number.isNaN(value) ? undefined : value),
    z
      .number({ required_error: 'Elegí el punto en el mapa', invalid_type_error: 'Elegí el punto en el mapa' })
      .min(min, 'Fuera de rango')
      .max(max, 'Fuera de rango'),
  );

export const addressSchema = z.object({
  street: z.string().trim().min(1, 'Ingresá la calle y el número'),
  city: z.string().trim().min(1, 'Ingresá la ciudad'),
  postalCode: z.string().trim().optional(),
  floor: z.string().trim().max(10, 'Máximo 10 caracteres').optional(),
  apartment: z.string().trim().max(10, 'Máximo 10 caracteres').optional(),
  formattedAddress: z.string().trim().optional(),
  additionalInstructions: z.string().trim().optional(),
  geocodePrecision: z.enum(['exact', 'approximate', 'unresolved']),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
