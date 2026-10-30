import type { TrafficFineV2 } from '../../services/api/types';
import { argentinaDay } from '../../utils/format';

/**
 * Lo que se espera que se pague: el importe voluntario mientras todavía vale (sin vencimiento o no vencido, día
 * argentino); si no, el de la multa. Es la misma regla que `importeEsperado` del back para el escaneo.
 */
export const expectedFineAmount = (
  fine: Pick<TrafficFineV2, 'amount' | 'voluntaryPaymentAmount' | 'dueDate'>,
  today: string = argentinaDay(new Date()),
): number => {
  const voluntaryStillValid = fine.voluntaryPaymentAmount != null && (fine.dueDate == null || fine.dueDate >= today);
  return voluntaryStillValid ? (fine.voluntaryPaymentAmount ?? fine.amount) : fine.amount;
};
