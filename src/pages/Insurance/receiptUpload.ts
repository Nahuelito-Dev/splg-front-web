/** Lo que comparten los formularios de pago con comprobante (cuotas del seguro y multas): archivo y estado del escaneo. */
export type ScanState = 'idle' | 'scanning' | 'done' | 'unavailable';

export const RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

export const SCAN_TEXT: Record<ScanState, string> = {
  idle: '',
  scanning: 'Escaneando…',
  done: 'Escaneo listo: revisá los datos',
  unavailable: 'Escaneo no disponible: cargá los datos',
};

export const fileError = (file: File): string | null => {
  if (!RECEIPT_TYPES.includes(file.type)) return 'Sólo se aceptan comprobantes PDF, JPG, PNG o WEBP.';
  if (file.size > MAX_BYTES) return 'El archivo no puede superar los 10 MB.';
  return null;
};
