import { z } from 'zod';
import type { SelectOption } from '../../common/components/ui';
import { normalizePatent } from '../../utils/patent';

/** Reglas del vehículo. Las comparte el alta desde la flota global y desde la ficha de un chofer. */
export const CAR_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Moto', label: 'Moto' },
  { value: 'Auto', label: 'Auto' },
  { value: 'Camioneta', label: 'Camioneta' },
  { value: 'Camión', label: 'Camión' },
  { value: 'Utilitario', label: 'Utilitario' },
];

/** Un número opcional: en el formulario el campo puede quedar vacío. */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === '' || value === undefined ? undefined : value), schema.optional());

export const FUEL_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Sin definir' },
  { value: 'diesel', label: 'Gasoil' },
  { value: 'gasoline', label: 'Nafta' },
  { value: 'cng', label: 'GNC' },
  { value: 'lpg', label: 'GLP' },
];

export const carSchema = z.object({
  user_id: z.string().trim().min(1, 'Elegí un chofer'),
  type_car: z.string().min(1, 'Elegí el tipo de vehículo'),
  car_patent: z
    .string()
    .trim()
    .min(1, 'Ingresá la patente')
    .transform(normalizePatent)
    .pipe(
      z
        .string()
        .min(1, 'Ingresá la patente')
        .regex(/^[A-Z0-9]{4,20}$/, 'La patente tiene entre 4 y 20 letras o números'),
    ),
  car_brand: z.string().trim().min(1, 'Ingresá la marca'),
  car_model: z.string().trim().min(1, 'Ingresá el modelo'),
  car_color: z.string().trim().optional(),
  car_year: optionalNumber(
    z.coerce
      .number()
      .int('Año inválido')
      .min(1970, 'Año inválido')
      .max(new Date().getFullYear() + 1, 'Año inválido'),
  ),
  car_capacity: optionalNumber(z.coerce.number().positive('Tiene que ser mayor a cero')),
  fuel_type: z.union([z.literal(''), z.enum(['diesel', 'gasoline', 'cng', 'lpg'])]),
  tank_capacity_liters: optionalNumber(
    z.coerce.number().min(1, 'Entre 1 y 9999 litros').max(9999, 'Entre 1 y 9999 litros'),
  ),
});

export type CarFormValues = z.infer<typeof carSchema>;
