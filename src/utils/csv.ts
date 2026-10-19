/** Helpers para armar y descargar archivos CSV en el navegador. */

/** Separador de columnas: en es-AR Excel usa `;` porque la coma es el decimal. */
const SEPARATOR = ';';
/** Una celda que empieza así la interpreta una planilla como fórmula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Un valor que se lee como texto aunque parezca un número (teléfono, documento, serie): no pierde ceros a la izquierda. */
class CsvText {
  constructor(readonly value: string) {}
}

/**
 * Marca un valor como texto. Se escribe como `="0341-4123"`, que Excel y Google Sheets muestran tal cual, sin
 * apóstrofo visible y sin convertirlo en número.
 */
export const asText = (value: string | number | null | undefined): CsvText | '' =>
  value === null || value === undefined || value === '' ? '' : new CsvText(String(value));

const quote = (str: string): string => (/[";\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str);

const escapeCsvValue = (value: unknown): string => {
  if (value instanceof CsvText) return quote(`="${value.value.replace(/"/g, '""')}"`);
  if (value === null || value === undefined) return '';
  // Sólo un `number` es un número (coma decimal, y «-5» es un monto, no una fórmula); un texto nunca se convierte.
  if (typeof value === 'number') return quote(String(value).replace('.', ','));
  let str = String(value);
  if (FORMULA_START.test(str)) str = `'${str}`;
  return quote(str);
};

/** Convierte filas de un mismo shape en un bloque CSV (separado por `;`) con encabezado. */
export const rowsToCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(escapeCsvValue).join(SEPARATOR)];
  rows.forEach((row) => lines.push(row.map(escapeCsvValue).join(SEPARATOR)));
  return lines.join('\n');
};

/** Dispara la descarga de un archivo de texto (CSV) en el navegador. */
export const downloadCsv = (filename: string, content: string) => {
  // BOM para que Excel reconozca UTF-8 correctamente (tildes, ñ).
  const blob = new Blob(['﻿' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-10-15 14:30` (hora local): el formato de fecha y hora que Excel reconoce como fecha. */
export const csvDateTime = (value: string | number | Date | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** `2026-10-15`: una fecha de calendario (sin hora ni zona) tal cual viene de la API. */
export const csvDay = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '');
