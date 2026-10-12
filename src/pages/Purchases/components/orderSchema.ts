import { z } from 'zod';

const units = (label: string) =>
  z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .int('Tiene que ser un número entero')
    .min(label === 'quantity' ? 1 : 0, label === 'quantity' ? 'Tiene que ser mayor a 0' : 'No puede ser negativo')
    .max(5000, 'Hasta 5.000 unidades');

/** `CreatePurchaseOrderDto`: hasta 20 renglones, 5.000 unidades y $90.000 por garrafa (topes del back). */
export const orderSchema = z.object({
  supplierId: z.string().min(1, 'Elegí el proveedor'),
  destinationWarehouseId: z.string(),
  expectedDate: z.string(),
  notes: z.string().trim().max(500, 'No puede tener más de 500 caracteres'),
  items: z
    .array(
      z.object({
        gasCylinderId: z.string().min(1, 'Elegí la garrafa'),
        quantity: units('quantity'),
        unitCost: z.coerce
          .number({ invalid_type_error: 'Ingresá un número' })
          .min(0, 'No puede ser negativo')
          .max(90000, 'Hasta $90.000 por garrafa'),
        emptiesToExchange: units('empties'),
      }),
    )
    .min(1, 'Agregá al menos una garrafa')
    .max(20, 'Hasta 20 renglones'),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

const common = (values: OrderFormValues) => ({
  destinationWarehouseId: values.destinationWarehouseId || undefined,
  expectedDate: values.expectedDate || null,
  notes: values.notes || null,
  items: values.items,
});

/** Alta: el cuerpo completo. */
export const orderCreateBody = (values: OrderFormValues) => ({ supplierId: values.supplierId, ...common(values) });

/** Edición en borrador: el proveedor sólo viaja si cambió. */
export const orderUpdateBody = (values: OrderFormValues, current: { supplierId: string }) => ({
  ...(values.supplierId !== current.supplierId ? { supplierId: values.supplierId } : {}),
  ...common(values),
});
