import { z } from 'zod';

const units = z.coerce
  .number({ invalid_type_error: 'Ingresá un número' })
  .int('Tiene que ser un número entero')
  .min(0, 'No puede ser negativo')
  .max(5000, 'Hasta 5.000 unidades');

/**
 * `CreatePurchaseReceiptDto`. Con orden (`mode: 'order'`) los renglones son los de lo pendiente y no pasan de él; sin
 * orden (`'direct'`) hace falta el proveedor y los renglones son libres. Llevar vacías sin recibir llenas es válido
 * (la planta se las lleva igual).
 */
export const receiptSchema = z
  .object({
    mode: z.enum(['order', 'direct']),
    supplierId: z.string(),
    warehouseId: z.string(),
    supplierDocumentType: z.enum(['delivery_note', 'invoice']),
    supplierDocumentNumber: z.string().trim().min(1, 'Ingresá el número del documento').max(30, 'Hasta 30 caracteres'),
    receivedAt: z.string(),
    notes: z.string().trim().max(500, 'No puede tener más de 500 caracteres'),
    items: z
      .array(
        z.object({
          gasCylinderId: z.string().min(1, 'Elegí la garrafa'),
          type: z.string(),
          pending: z.number().optional(),
          quantityFull: units,
          quantityEmptyOut: units,
          unitCost: z.coerce
            .number({ invalid_type_error: 'Ingresá un número' })
            .min(0, 'No puede ser negativo')
            .max(90000, 'Hasta $90.000 por garrafa'),
        }),
      )
      .max(20, 'Hasta 20 renglones'),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'direct' && !values.supplierId) {
      ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Elegí el proveedor' });
    }
    values.items.forEach((item, index) => {
      if (item.pending !== undefined && item.quantityFull > item.pending) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'quantityFull'],
          message: `Solo faltan ${item.pending} por recibir`,
        });
      }
    });
    if (!values.items.some((i) => i.quantityFull > 0 || i.quantityEmptyOut > 0)) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'Cargá al menos una garrafa recibida o una vacía' });
    }
  });

export type ReceiptFormValues = z.infer<typeof receiptSchema>;
