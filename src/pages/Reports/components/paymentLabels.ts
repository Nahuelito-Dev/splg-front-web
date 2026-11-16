/** No es un enum en la API (`method: string`): se mapean los valores conocidos y se muestra el resto tal cual. */
export const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia',
};
