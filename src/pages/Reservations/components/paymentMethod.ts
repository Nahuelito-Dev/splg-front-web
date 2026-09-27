import type { OrderRecord } from '../../../services/api/types';
import { PAYMENT_METHOD } from '../../../utils/statusLabels';

/** ReservaResponseDto.paymentMethod llega como string suelto: la API no le puso el enum. */
export const isKnownPaymentMethod = (value: string): value is OrderRecord['paymentMethod'] => value in PAYMENT_METHOD;
