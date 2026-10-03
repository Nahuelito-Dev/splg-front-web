/** Helpers para armar y descargar archivos CSV en el navegador. */

/** Separador de columnas: en es-AR Excel usa `;` porque la coma es el decimal. */
const SEPARATOR = ';';
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Una celda que empieza así la interpreta una planilla como fórmula. */
const FORMULA_START = /^[=+\-@\t\r]/;

const escapeCsvValue = (value: unknown): string => {
  let str: string;
  if (value === null || value === undefined) str = '';
  else if (typeof value === 'number' || (typeof value === 'string' && NUMERIC.test(value))) {
    // Un número se escribe con coma decimal y no se toca: «-5» es un monto, no una fórmula.
    str = String(value).replace('.', ',');
  } else {
    str = String(value);
    if (FORMULA_START.test(str)) str = `'${str}`;
  }
  return /[";\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
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
