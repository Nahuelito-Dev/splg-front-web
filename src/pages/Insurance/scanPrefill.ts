import type { ReceiptScanData } from '../../services/api/types';
import { toLocalInput } from '../FleetExpense/fleetExpenseDates';

/**
 * El importe que leyó el escaneo (texto, con formato argentino o con punto decimal) como número; `null` si no es
 * un importe. Con coma y punto a la vez, el último separador es el decimal.
 */
export const parseScanAmount = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  let text = raw.replace(/[^\d.,-]/g, '');
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (comma >= 0) {
    text = /,\d{1,2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '');
  } else if (dot >= 0 && !/\.\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, '');
  }
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** El pago leído como valor de un `datetime-local`; una fecha sin hora queda al mediodía para no correrse de día. */
export const scanPaidAtToLocal = (raw: string | null | undefined): string => {
  if (!raw) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00` : toLocalInput(raw);
};

export interface PaymentPrefill {
  paidAt: string;
  amount: number | string;
  operationNumber: string;
}

/** Lo que el escaneo precarga en el formulario de pago; lo que no leyó queda con el valor por defecto. */
export const prefillFromScan = (data: ReceiptScanData, fallback: PaymentPrefill): PaymentPrefill => ({
  paidAt: scanPaidAtToLocal(data.paidAt) || fallback.paidAt,
  amount: parseScanAmount(data.amount) ?? fallback.amount,
  operationNumber: data.operationNumber ?? fallback.operationNumber,
});
