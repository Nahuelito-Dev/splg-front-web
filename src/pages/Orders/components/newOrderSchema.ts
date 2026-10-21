import { z } from 'zod';
import { argentinaDay } from '../../../utils/format';

/** Un renglón del pedido (`OrderItemDto`): garrafa, cantidad y el precio al que se vendió. */
const orderItemSchema = z.object({
  gasCylinderId: z.string().trim().min(1, 'Elegí una garrafa'),
  quantity: z.coerce.number().int('Tiene que ser un número entero').min(1, 'Mínimo 1 unidad'),
  unitPrice: z.coerce.number().nonnegative('No puede ser negativo'),
});

/**
 * Alta telefónica y reserva programada con seña (CU-072, `CreateOrderDto`): mismos campos y reglas que la API. Con
 * `isReservation` exige fecha agendada que no sea pasada, seña numérica no negativa, no se paga con cuenta corriente y
 * no se combina con el express.
 */
export const newOrderSchema = z
  .object({
    customerId: z.string().trim().min(1, 'Elegí un cliente'),
    addressId: z.string().trim().min(1, 'Elegí una dirección de entrega'),
    items: z.array(orderItemSchema).min(1, 'Agregá al menos un ítem'),
    deliveryMode: z.enum(['standard', 'express']),
    paymentMethod: z.enum(['cash', 'mercadopago', 'transfer', 'account'], { message: 'Elegí un método de pago' }),
    notes: z
      .string()
      .trim()
      .max(500, 'No puede tener más de 500 caracteres')
      .optional()
      .transform((value) => value || undefined),
    isReservation: z.boolean().optional(),
    /** YYYY-MM-DD; sólo cuenta con reserva. */
    scheduledDate: z.string().optional(),
    /** `''` = sin franja. */
    timeSlotId: z.string().optional(),
    /** Texto del campo; sólo cuenta con reserva. */
    depositAmount: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isReservation) return;
    const date = values.scheduledDate ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ctx.addIssue({ code: 'custom', path: ['scheduledDate'], message: 'Una reserva requiere fecha de entrega' });
    } else if (date < argentinaDay(new Date())) {
      ctx.addIssue({ code: 'custom', path: ['scheduledDate'], message: 'No se puede agendar en una fecha pasada' });
    }
    const deposit = (values.depositAmount ?? '').trim().replace(',', '.');
    if (deposit === '' || !Number.isFinite(Number(deposit))) {
      ctx.addIssue({ code: 'custom', path: ['depositAmount'], message: 'Indicá el monto de la seña (0 si no deja)' });
    } else if (Number(deposit) < 0) {
      ctx.addIssue({ code: 'custom', path: ['depositAmount'], message: 'La seña no puede ser negativa' });
    }
    if (values.paymentMethod === 'account') {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentMethod'],
        message: 'Una reserva no se puede pagar con cuenta corriente',
      });
    }
    if (values.deliveryMode === 'express') {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryMode'],
        message: 'Un pedido express no se agenda: no se combina con una reserva',
      });
    }
  });

export type NewOrderValues = z.infer<typeof newOrderSchema>;
