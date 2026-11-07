import { z } from 'zod';
import type {
  AdjustCustomerContainersBody,
  CustomerContainerReason,
} from '../../../../services/api/customerContainers';

/** Los mismos límites que valida el back para un ajuste manual. */
export const NOTE_MIN = 10;
export const NOTE_MAX = 500;
export const QUANTITY_MAX = 1000;

/** El motivo de cada movimiento de la cuenta de envases, como lo lee quien opera. */
export const CONTAINER_REASON: Record<CustomerContainerReason, string> = {
  initial_from_deliveries: 'Saldo inicial por entregas',
  purchased: 'Compra de envase',
  manual_adjustment: 'Ajuste manual',
  returned: 'Devolución',
};

/** Un motivo que el panel todavía no conoce se muestra tal cual, en vez de romper la lista. */
export const containerReasonText = (reason: string): string =>
  CONTAINER_REASON[reason as CustomerContainerReason] ?? reason;

/** La cantidad con su signo: «+2», «−1». */
export const signedQuantity = (quantity: number): string =>
  quantity > 0 ? `+${quantity}` : quantity < 0 ? `−${Math.abs(quantity)}` : '0';

export const adjustSchema = z.object({
  gasCylinderId: z.string().min(1, 'Elegí el tipo de garrafa'),
  direction: z.enum(['add', 'remove'], { errorMap: () => ({ message: 'Elegí si sumás o restás' }) }),
  // Vacío (o algo que no es un número) es «falta la cantidad», no un 0.
  count: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : Number(value)),
    z
      .number({ required_error: 'Escribí la cantidad', invalid_type_error: 'Escribí la cantidad' })
      .int('La cantidad tiene que ser un número entero')
      .min(1, 'La cantidad tiene que ser al menos 1')
      .max(QUANTITY_MAX, `Hasta ${QUANTITY_MAX} envases por ajuste`),
  ),
  note: z
    .string()
    .trim()
    .min(NOTE_MIN, `Escribí el motivo del ajuste (al menos ${NOTE_MIN} caracteres)`)
    .max(NOTE_MAX, `Hasta ${NOTE_MAX} caracteres`),
});

export type AdjustFormValues = z.infer<typeof adjustSchema>;

/** Lo que viaja al back: la cantidad con signo (restar manda negativo) y la nota recortada. */
export const toAdjustBody = (values: AdjustFormValues): AdjustCustomerContainersBody => ({
  gasCylinderId: values.gasCylinderId,
  quantity: values.direction === 'remove' ? -values.count : values.count,
  note: values.note.trim(),
});
