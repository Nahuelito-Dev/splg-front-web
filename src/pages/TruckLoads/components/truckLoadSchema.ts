import { z } from 'zod';

const units = (min: number, message: string) =>
  z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un número entero')
    .min(min, message)
    .max(2000, 'Hasta 2.000 unidades');

/** Renglones de la carga: llenas y vacías desde 0, sin repetir el tipo. */
export const loadItemsSchema = z
  .array(
    z.object({
      gasCylinderId: z.string().min(1, 'Elegí la garrafa'),
      loadedFull: units(0, 'No puede ser negativo'),
      loadedEmpty: units(0, 'No puede ser negativo'),
    }),
  )
  .min(1, 'Agregá al menos una garrafa')
  .max(20, 'Hasta 20 renglones')
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (item.gasCylinderId && seen.has(item.gasCylinderId)) {
        ctx.addIssue({ code: 'custom', path: [index, 'gasCylinderId'], message: 'Ese tipo ya está en la carga' });
      }
      seen.add(item.gasCylinderId);
    });
  });

/** `CreateTruckLoadDto`: el camión tiene que estar en uso por el chofer (la API lo verifica). */
export const openLoadSchema = z.object({
  deliveryId: z.string().min(1, 'Elegí el chofer'),
  carId: z.string().min(1, 'Elegí el camión'),
  helperEmployeeId: z.string(),
  originWarehouseId: z.string(),
  notes: z.string().trim().max(300, 'No puede tener más de 300 caracteres'),
  items: loadItemsSchema,
});

export type OpenLoadFormValues = z.infer<typeof openLoadSchema>;

/** Reposición en ruta: sólo llenas, sin repetir el tipo. */
export const reloadSchema = z.object({
  items: z
    .array(
      z.object({ gasCylinderId: z.string().min(1, 'Elegí la garrafa'), quantity: units(1, 'Tiene que ser mayor a 0') }),
    )
    .min(1, 'Agregá al menos una garrafa')
    .max(20, 'Hasta 20 renglones')
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (item.gasCylinderId && seen.has(item.gasCylinderId)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'gasCylinderId'],
            message: 'Ese tipo ya está en la reposición',
          });
        }
        seen.add(item.gasCylinderId);
      });
    }),
});
export type ReloadFormValues = z.infer<typeof reloadSchema>;

/** Lo que se declara es obligatorio: se cuenta, no se da por bueno lo esperado (vacío no es 0). */
const counted = z
  .string()
  .trim()
  .min(1, 'Contá y cargá este valor')
  .regex(/^\d+$/, 'Tiene que ser un número entero, 0 o más')
  .refine((v) => Number(v) <= 4000, 'Hasta 4.000 unidades');

/** Declarar la vuelta: lo que vuelve de cada tipo, llenas y vacías. */
export const returnSchema = z.object({
  items: z.array(
    z.object({ gasCylinderId: z.string(), type: z.string(), declaredFull: counted, declaredEmpty: counted }),
  ),
});
export type ReturnFormValues = z.infer<typeof returnSchema>;
