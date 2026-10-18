import { z } from 'zod';

/** Un renglón del pedido (`OrderItemDto`): garrafa, cantidad y el precio al que se vendió. */
const orderItemSchema = z.object({
  gasCylinderId: z.string().trim().min(1, 'Elegí una garrafa'),
  quantity: z.coerce.number().int('Tiene que ser un número entero').min(1, 'Mínimo 1 unidad'),
  unitPrice: z.coerce.number().nonnegative('No puede ser negativo'),
});

/** Alta telefónica (CU-072, `CreateOrderDto`): mismos campos que pide la API, sin turno ni reserva. */
export const newOrderSchema = z.object({
  customerId: z.string().trim().min(1, 'Elegí un cliente'),
  addressId: z.string().trim().min(1, 'Elegí una dirección de entrega'),
  items: z.array(orderItemSchema).min(1, 'Agregá al menos un ítem'),
  deliveryMode: z.enum(['standard', 'express']),
  paymentMethod: z.enum(['cash', 'mercadopago', 'transfer'], { message: 'Elegí un método de pago' }),
  notes: z
    .string()
    .trim()
    .max(500, 'No puede tener más de 500 caracteres')
    .optional()
    .transform((value) => value || undefined),
});

export type NewOrderValues = z.infer<typeof newOrderSchema>;
